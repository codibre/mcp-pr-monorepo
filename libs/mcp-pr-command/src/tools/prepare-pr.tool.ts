import z from 'zod';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
	context,
	createTempFile,
	generateChangesFile,
	ToolRegister,
} from '../internal';
import { inferCardLinkFromBranch } from '../internal/card-link-utils';
import { Nullable, assertNonNullish } from 'is-this-a-pigeon';
import { McpServer, ToolCallback } from '../internal';

const inputSchema = {
	cwd: z
		.string()
		.min(1)
		.describe('Current working directory of the repository'),
	targetBranch: z.string(),
	currentBranch: z.string(),
	cardLink: z.string().optional(),
};

export class PreparePrTool implements ToolRegister {
	// Shared output schema for prepare-pr and update-pr-by-link
	static readonly preparePrOutputSchema = {
		prNumber: z.number().nullable(),
		currentBranch: z.string().optional(),
		targetBranch: z.string().optional(),
		filesToRead: z.array(z.string()).optional(),
		prDescriptionAndTitleInstructions: z.string().optional(),
		prTemplate: z.string().nullable(),
		cardLinks: z.array(z.string()).optional(),
		mcpToolHint: z.string().optional(),
		fetchCardInfoBeforeStep3: z.boolean().optional(),
		nextActions: z.array(z.string()),
		error: z.string().optional(),
	};
	registerTool(server: McpServer): void {
		server.registerTool(
			'prepare-pr',
			{
				title: 'Opening or updating PR workflow, step 2: Prepare PR',
				description: `Step 2 of the PR workflow.
Prepares PR artifacts and conversational instructions based on the selected branches.
Input schema:
{
  cwd: string,           // Required. Current working directory of the repository.
  targetBranch: string,  // Required. Target branch for the PR.
  currentBranch: string, // Required. Current branch.
  cardLink?: string      // Optional. Card link.
}
Usage example:
{
  "cwd": "/home/user/my-repo",
  "targetBranch": "staging",
  "currentBranch": "mcp-pr-server",
  "cardLink": "https://tracker/card/123"
}
This step generates commit summaries, diffs, and instructions for Copilot chat to guide the user through PR creation or update.
After calling this tool, follow nextActions todo list rigourously`,
				inputSchema,
				outputSchema: PreparePrTool.preparePrOutputSchema,
			},
			PreparePrTool.preparePr as ToolCallback<typeof inputSchema>,
		);
	}

	static async preparePr(params: {
		cwd: string;
		targetBranch: string;
		currentBranch: string;
		cardLink?: string;
	}) {
		const { targetBranch, currentBranch, cardLink = '', cwd } = params;
		if (!targetBranch || !currentBranch) {
			return {
				content: [
					{
						type: 'text',
						text: 'Missing required parameters: targetBranch or currentBranch.',
					},
				],
			};
		}
		let prListOutput = '';
		let existingPR: Nullable<number> = null;
		let existingPRContent: Nullable<{ title: string; body: string }> = null;
		let prContentFile: string | null = null;
		const githubDir = path.join(cwd, '.github');
		let prTemplate: string | null = null;
		if (fs.existsSync(githubDir)) {
			const files = fs.readdirSync(githubDir);
			const match = files.find(
				(f) => f.toLowerCase() === 'pull_request_template.md',
			);
			if (match) prTemplate = `.github/${match}`;
		}
		prListOutput = execSync(
			`gh pr list --base ${targetBranch} --head ${currentBranch} --json number`,
			{ encoding: 'utf8', cwd },
		).trim();
		if (prListOutput) {
			const prList: Nullable<Array<{ number: number }>> =
				JSON.parse(prListOutput);
			if (prList?.[0]?.number) existingPR = prList[0].number;
		}
		if (existingPR) {
			const prDetailOutput = execSync(
				`gh pr view ${existingPR} --json title,body`,
				{ encoding: 'utf8', cwd },
			).trim();
			if (prDetailOutput) {
				existingPRContent = JSON.parse(prDetailOutput);
				assertNonNullish(
					existingPRContent,
					'Existing PR content should be defined',
				);
				prContentFile = await createTempFile(
					`.copilot-pr-content-${existingPR}.md`,
					`Title: ${existingPRContent.title}\n\n${existingPRContent.body || ''}`,
					cwd,
				);
			}
		}
		const changesFile = await generateChangesFile(
			targetBranch,
			currentBranch,
			cwd,
		);
		const candidateSet = new Set<string>();
		if (cardLink) candidateSet.add(cardLink);
		const inferred = inferCardLinkFromBranch(currentBranch);
		if (inferred) candidateSet.add(inferred);
		const urlRegex = context.cardLinkWebSitePattern;
		if (
			urlRegex &&
			existingPRContent &&
			typeof existingPRContent === 'object'
		) {
			const title = existingPRContent.title || '';
			const body = existingPRContent.body || '';
			const textToScan = `${title}\n${body}`;
			const matches = textToScan.match(urlRegex) || [];
			for (const m of matches) candidateSet.add(m);
		}
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
				'We have car links to read! Verify if there any MCP available to fetch card info. Ex: any businessmap specialized MCP. Do not proceed before doing it',
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
		return {
			content: [
				{
					type: 'text',
					text: `Prepared PR artifacts successfully. Changes file: '${changesFile}'.${existingPR ? ` Existing PR #${existingPR} will be updated.` : ' A new PR will be created.'}`,
				},
			],
			structuredContent: {
				prNumber: existingPR || null,
				prTemplate,
				prDescriptionAndTitleInstructions: {
					changesFile,
					existingPRContent,
					prTemplate,
				},
				filesToRead,
				cardLinks,
				fetchCardInfoBeforeStep3: true,
				nextActions: nextActions.map((x, idx) => `${idx + 1}. ${x}`),
			},
		};
	}
}
