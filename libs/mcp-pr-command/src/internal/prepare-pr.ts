import fs from 'fs/promises';
import { OmitFields, Nullable, assertNonNullish } from 'is-this-a-pigeon';
import z from 'zod';
import { Infer, McpResult } from './mcp';
import { ghClient } from './gh-client-instance';
import { cwdJoin } from './cwd';
import { gitService } from './git-service';
import { inferCardLinkFromBranch } from './card-link-utils';
import { context } from './context';
import { buildCopilotPrompt } from './build-copilot-prompt';
import { buildTextResult } from './build-result';
import { createTempFile } from './temp-file';

async function existDir(githubDir: string) {
	try {
		await fs.access(githubDir);
		return true;
	} catch {
		return false;
	}
}

export const preparePrInputSchema = {
	cwd: z
		.string()
		.min(1)
		.describe('Current working directory of the repository'),
	targetBranch: z.string(),
	currentBranch: z.string(),
	cardLink: z.string().optional(),
};

export const preparePrOutputSchema = {
	prNumber: z.number().nullable(),
	filesToRead: z.array(z.string()).optional(),
	prDescriptionAndTitleInstructions: z.string().optional(),
	prTemplate: z.string().nullable(),
	cardLinks: z.array(z.string()).optional(),
	mcpToolHint: z.string().optional(),
	fetchCardInfoBeforeStep3: z.boolean().optional(),
	nextActions: z.array(z.string()),
	error: z.string().optional(),
};

async function* getPRContentStream(existingPRContent: {
	title: string;
	body: string;
}) {
	yield 'Title: ';
	yield existingPRContent.title;
	yield '\n\n';
	yield existingPRContent.body ?? '';
}

export async function preparePr(
	params: OmitFields<Infer<typeof preparePrInputSchema>, 'cwd'>,
): Promise<McpResult<typeof preparePrOutputSchema>> {
	const { targetBranch, currentBranch, cardLink = '' } = params;
	// used ghClient.prList instead of direct gh exec
	let existingPR: Nullable<number> = null;
	let prContentFile: string | null = null;
	const githubDir = cwdJoin('.github');
	let prTemplate: string | null = null;
	const candidateSet = new Set<string>();
	if (await existDir(githubDir)) {
		const files = await fs.readdir(githubDir);
		const match = files.find(
			(f) => f.toLowerCase() === 'pull_request_template.md',
		);
		if (match) prTemplate = `.github/${match}`;
	}

	const prList = await ghClient.prList({
		base: targetBranch,
		head: currentBranch,
	});
	if (prList?.[0]?.number) existingPR = prList[0].number;
	if (existingPR) {
		const details = await ghClient.prView(existingPR, ['title', 'body']);
		assertNonNullish(details, 'Existing PR content should be defined');
		prContentFile = await createTempFile(
			`.copilot-pr-content-${existingPR}.md`,
			getPRContentStream(details),
		);
		if (context.cardLinkWebSitePattern) {
			const title = details.title || '';
			const body = details.body || '';
			const textToScan = `${title}\n${body}`;
			const matches = textToScan.match(context.cardLinkWebSitePattern) || [];
			for (const m of matches) candidateSet.add(m);
		}
	}

	// Fetch remote target branch
	await gitService.fetch(targetBranch);

	// Check for the branch locally or on the remote (origin)
	const localExists = await gitService.refExists(targetBranch, {
		where: 'local',
	});
	const remoteExists = await gitService.refExists(targetBranch, {
		where: 'remote',
		remote: 'origin',
	});

	if (!remoteExists && !localExists) {
		throw new Error(
			`Target branch '${targetBranch}' not found locally or on remote. Please verify the branch name.`,
		);
	}

	// If local branch doesn't exist but remote does, create it from remote
	if (!localExists && remoteExists) {
		// create local branch from remote head (origin)
		await gitService.createLocalBranchFromRemote(targetBranch, targetBranch, {
			remote: 'origin',
		});
	}

	const changesFile = await gitService.generateChangesFile(
		targetBranch,
		currentBranch,
	);

	if (cardLink) candidateSet.add(cardLink);
	const inferred = inferCardLinkFromBranch(currentBranch);
	if (inferred) candidateSet.add(inferred);
	const cardLinks = Array.from(candidateSet);
	const filesToRead: string[] = [];
	if (changesFile) filesToRead.push(changesFile);
	if (prContentFile) filesToRead.push(prContentFile);
	const nextActions: string[] = [];
	nextActions.push('Read filesToRead files for context');
	nextActions.push('Read prTemplate to use as PR body template');
	nextActions.push(
		'Generate PR title and body using the gathered information and including summary for each card read respecting template structure',
	);
	if (cardLinks.length > 0) {
		nextActions.push(
			'We have car links to read! Verify if there any MCP available to fetch card info. Ex: any card app/website specialized MCP. Do not proceed before doing it',
		);
		nextActions.push(
			'fetch cards info using MCP for context before doing anything else',
		);
	}
	nextActions.push(
		'User NEED to see changes before proceed. Show title and full pr body, as a code block. Ask for confirmation to proceed but do not skip printing pr description',
	);
	nextActions.push(
		'If user asks to changes something, apply changes and show title and body again. Repeat until user confirms it is ok',
	);
	nextActions.push('Run tool submit-pr');
	return buildTextResult<typeof preparePrOutputSchema>(
		`Prepared PR artifacts successfully. Changes file: '${changesFile}'.${existingPR ? ` Existing PR #${existingPR} will be updated.` : ' A new PR will be created.'}`,
		{
			prNumber: existingPR,
			prTemplate,
			prDescriptionAndTitleInstructions: buildCopilotPrompt({
				changesFile,
				prContentFile,
				prTemplate,
			}),
			filesToRead,
			cardLinks,
			fetchCardInfoBeforeStep3: true,
			nextActions: nextActions.map((x, idx) => `${idx + 1}. ${x}`),
		},
	);
}
