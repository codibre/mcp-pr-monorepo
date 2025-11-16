import z from 'zod';
import fs from 'fs/promises';
import {
	buildTextResult,
	getBranchSchema,
	Infer,
	isProtectedBranch,
	McpResult,
	ToolRegister,
	attempt,
	McpServer,
	contextService,
	getErrorMessage,
	gitService,
	createSystemTempFile,
} from '../internal';

const inputSchema = {
	cwd: z.string().min(1),
	current: z.string().min(1),
	target: z.string().min(1),
	commits: z.array(z.string()),
};
const outputSchema = {
	replaced: z.number(),
	error: z.string().optional(),
};

export class ReplaceCommitMessagesTool implements ToolRegister {
	registerTool(server: McpServer): void {
		contextService.registerTool(
			server,
			'replace-commit-messages',
			{
				title: 'Replace commit messages between two branches',
				description: `Rewrites the commit messages between target and current with the supplied list of messages (same ordering as get-commit-messages).
Input schema:
{
  cwd: string,
  current: string,
  target: string,
  commits: string[]
}
IMPORTANT:
If repo uses commitlint, ensure that new commit messages comply with the rules to avoid push rejections. Check commitlint.config.js or .commitlintrc.js for the rules used in the repository.
Discourage refactoring changes in branches with names starting with release, as they may have commits merged into staging branch.
Discourage refactoring changes in special branches, like main, staging, production, develop, etc.
Commits must have good description for changelogs generation and for other tools that may use them.
`,
				inputSchema,
				outputSchema,
			},
			this.replaceCommitMessages.bind(this),
		);
	}
	async replaceCommitMessages(
		params: Infer<typeof inputSchema>,
	): Promise<McpResult<typeof outputSchema>> {
		const { current, target, commits: newMessages } = params;
		if (!current || !target || !Array.isArray(newMessages)) {
			throw new Error(
				'Missing required parameters: cwd, current, target, or commits array',
			);
		}
		if (isProtectedBranch(current)) {
			const schema = getBranchSchema();
			const protectedList = Object.values(schema).join(', ');
			throw new Error(
				`Operation not allowed: branch '${current}' is a protected schema branch. Only feature/fix branches can have their history altered. Protected branches: ${protectedList}`,
			);
		}
		await gitService.tryFetch(target);
		let gitHashesOut = '';
		const baseExists = await gitService.refExists(params.target, {
			where: 'remote',
			remote: 'origin',
		});
		const headExists = await gitService.refExists(params.current, {
			where: 'local',
		});
		if (!baseExists || !headExists) {
			throw new Error(
				`One or both of the specified branches do not exist: target='${target}' (remote:origin), current='${current}' (local)`,
			);
		}
		gitHashesOut = await gitService.logRange(params.target, params.current, {
			format: 'hashes',
			currentLocal: 'local',
			targetLocal: 'remote',
		});
		if (!gitHashesOut) {
			throw new Error(
				`Failed to list commits: no commits found between '${target}' and '${current}'`,
			);
		}
		const entries = gitHashesOut
			.split('\n---END---\n')
			.map((s) => s.trim())
			.filter(Boolean);
		const hashes = entries.map((e) => e.split('\n')[0]).filter(Boolean);
		if (hashes.length !== newMessages.length) {
			throw new Error(
				`Commit count mismatch. Diff has ${hashes.length} commits but received ${newMessages.length} messages.`,
			);
		}
		// Ensure current branch is pushed to origin so origin acts as authoritative backup
		try {
			await gitService.push('origin', current);
		} catch (e) {
			const msg = getErrorMessage(e);
			throw new Error(
				`Failed to push branch '${current}' to origin before rewriting: ${msg}`,
			);
		}
		const tempBranch = `temp/rewrite-messages-${Date.now()}`;
		try {
			await gitService.fetch(target);
			await gitService.tryFetch(current);
			await gitService.checkoutBranch(tempBranch, {
				new: true,
				startPoint: current,
			});
		} catch (e) {
			const msg = getErrorMessage(e);
			throw new Error(`Failed to create temporary branch: ${msg}`);
		}
		const applyOrder = hashes.slice().reverse();
		const messagesInApplyOrder = newMessages.slice().reverse();
		try {
			const mapping: Record<string, string> = {};
			for (let i = 0; i < applyOrder.length; i++) {
				const hash = applyOrder[i];
				if (!hash) continue;
				const newMsg = (messagesInApplyOrder[i] || '')
					.replace(/\r\n/g, '\n')
					.trim();
				let currentMsg = '';
				try {
					currentMsg = await gitService.showCommitBody(hash);
				} catch {
					currentMsg = '';
				}
				if (newMsg !== currentMsg) {
					mapping[hash] = messagesInApplyOrder[i] || '';
				}
			}
			if (Object.keys(mapping).length === 0) {
				await attempt(() => gitService.checkoutBranch(current));
				await attempt(() => gitService.deleteBranch(tempBranch));
				return buildTextResult<typeof outputSchema>(
					'No commit messages differ from the provided ones; nothing to rewrite.',
					{ replaced: 0 },
				);
			}
			const mappingFile = await createSystemTempFile(
				`COMMIT_MSG_MAPPING_${Date.now()}.json`,
				JSON.stringify(mapping, null, 2),
			);
			const filterScript = await createSystemTempFile(
				`msg-filter-${Date.now()}.sh`,
				`#!/bin/sh
# git filter-branch provides the current commit in $GIT_COMMIT
export MAPPING_FILE="${mappingFile}"
COMMIT_HASH="$GIT_COMMIT"

if [ -f "$MAPPING_FILE" ]; then
  node - <<'NODE'
const fs = require('fs');
const mapping = JSON.parse(fs.readFileSync(process.env.MAPPING_FILE, 'utf8'));
const hash = process.env.GIT_COMMIT;
if (mapping[hash]) {
  console.log(mapping[hash]);
} else {
  const stdin = fs.readFileSync(0, 'utf8');
  process.stdout.write(stdin);
}
NODE
else
  cat
fi
`,
			);
			await fs.chmod(filterScript, '0755');
			try {
				await gitService.filterBranchMsgFilter(
					target,
					tempBranch,
					filterScript,
				);
			} finally {
				await attempt(() => fs.unlink(mappingFile));
				await attempt(() => fs.unlink(filterScript));
				await attempt(() =>
					fs.rm(mappingFile, { recursive: true, force: true }),
				);
				await attempt(() =>
					fs.rm(filterScript, { recursive: true, force: true }),
				);
			}
		} catch (e) {
			await attempt(async () => await gitService.reset({ mode: 'hard' }));
			await attempt(async () => await gitService.checkoutBranch(current));
			await attempt(async () => await gitService.deleteBranch(tempBranch));
			const msg = getErrorMessage(e);
			throw new Error(`Failed while rewriting commits: ${msg}`);
		}
		try {
			const newHead = await gitService.revParseHead();
			await gitService.branchForceUpdate(current, newHead);
			await gitService.checkoutBranch(current);
			await gitService.push('origin', current, { force: true });
		} catch (e) {
			await attempt(async () => await gitService.checkoutBranch(current));
			await attempt(async () => await gitService.deleteBranch(tempBranch));
			const msg = getErrorMessage(e);
			throw new Error(`Failed to update branch or push changes: ${msg}`);
		} finally {
			await attempt(async () => await gitService.deleteBranch(tempBranch));
		}
		return buildTextResult<typeof outputSchema>(
			`Successfully replaced ${hashes.length} commit message(s) on branch '${current}`,
			{ replaced: hashes.length },
		);
	}
}
