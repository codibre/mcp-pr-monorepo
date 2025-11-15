import z from 'zod';
import fs from 'fs';
import {
	createBackupTag,
	getBranchSchema,
	Infer,
	isProtectedBranch,
	McpResult,
	ToolRegister,
	attempt,
	McpServer,
	contextService,
	cwdJoin,
	getErrorMessage,
	gitService,
	LocalType,
} from '../internal';

const inputSchema = {
	cwd: z.string().min(1),
	current: z.string().min(1),
	target: z.string().min(1),
	commits: z.array(z.string()),
};
const outputSchema = {
	replaced: z.number(),
	backupTag: z.string().optional(),
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
			return {
				content: [
					{
						type: 'text',
						text: 'Missing required parameters: cwd, current, target, or commits array',
					},
				],
				structuredContent: { error: 'invalid_input', replaced: 0 },
			};
		}
		if (isProtectedBranch(current)) {
			const schema = getBranchSchema();
			const protectedList = Object.values(schema).join(', ');
			return {
				content: [
					{
						type: 'text',
						text: `Operation not allowed: branch '${current}' is a protected schema branch. Only feature/fix branches can have their history altered. Protected branches: ${protectedList}`,
					},
				],
				structuredContent: { error: 'protected_branch', replaced: 0 },
			};
		}
		type RefWhere = { ref: string; where: LocalType };
		const baseCandidates: RefWhere[] = [
			{ ref: target, where: 'remote' },
			{ ref: target, where: 'local' },
		];
		const headCandidates: RefWhere[] = [
			{ ref: current, where: 'local' },
			{ ref: current, where: 'remote' },
		];
		let gitHashesOut = '';
		let baseRefUsed: string | null = null;
		let headRefUsed: string | null = null;
		let lastErr: unknown = null;
		for (const baseRef of baseCandidates) {
			for (const headRef of headCandidates) {
				const baseExists = await gitService.refExists(baseRef.ref, {
					where: baseRef.where,
					remote: baseRef.where === 'remote' ? 'origin' : undefined,
				});
				const headExists = await gitService.refExists(headRef.ref, {
					where: headRef.where,
					remote: headRef.where === 'remote' ? 'origin' : undefined,
				});
				if (!baseExists || !headExists) continue;
				try {
					const baseExpr = baseRef.ref;
					const headExpr = headRef.ref;
					gitHashesOut = await gitService.logRange(baseExpr, headExpr, {
						format: 'hashes',
					});
					baseRefUsed = baseExpr;
					headRefUsed = headExpr;
					break;
				} catch (e) {
					lastErr = e;
				}
			}
			if (gitHashesOut) break;
		}
		if (!gitHashesOut) {
			const msg = lastErr
				? getErrorMessage(lastErr)
				: 'unknown error while running git log';
			return {
				content: [{ type: 'text', text: `Failed to list commits: ${msg}` }],
				structuredContent: { error: msg, replaced: 0 },
			};
		}
		const entries = gitHashesOut
			.split('\n---END---\n')
			.map((s) => s.trim())
			.filter(Boolean);
		const hashes = entries.map((e) => e.split('\n')[0]).filter(Boolean);
		if (hashes.length !== newMessages.length) {
			return {
				content: [
					{
						type: 'text',
						text: `Commit count mismatch. Diff has ${hashes.length} commits but received ${newMessages.length} messages.`,
					},
				],
				structuredContent: {
					error: 'commit_count_mismatch',
					diffCount: hashes.length,
					providedCount: newMessages.length,
					replaced: 0,
				},
			};
		}
		let backupTag;
		try {
			backupTag = await createBackupTag(current);
		} catch (e) {
			const msg = getErrorMessage(e);
			return {
				content: [{ type: 'text', text: `Failed to create backup: ${msg}` }],
				structuredContent: { error: msg, replaced: 0 },
			};
		}
		const tempBranch = `temp/rewrite-messages-${Date.now()}`;
		try {
			await gitService.fetch(target);
			await gitService.tryFetch(current);
			const createFrom = headRefUsed || current;
			await gitService.checkoutBranch(tempBranch, {
				new: true,
				startPoint: createFrom,
			});
		} catch (e) {
			await attempt(() => gitService.deleteTag(backupTag));
			const msg = getErrorMessage(e);
			return {
				content: [
					{ type: 'text', text: `Failed to create temporary branch: ${msg}` },
				],
				structuredContent: { error: msg, replaced: 0 },
			};
		}
		const applyOrder = hashes.slice().reverse();
		const messagesInApplyOrder = newMessages.slice().reverse();
		try {
			const mappingFile = cwdJoin(`.git/COMMIT_MSG_MAPPING_${Date.now()}.json`);
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
				await attempt(() => gitService.deleteTag(backupTag));
				return {
					content: [
						{
							type: 'text',
							text: 'No commit messages differ from the provided ones; nothing to rewrite.',
						},
					],
					structuredContent: { replaced: 0 },
				};
			}
			fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');
			const filterScript = cwdJoin(`.git/msg-filter-${Date.now()}.sh`);
			const scriptContent = `#!/bin/sh
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
`;
			fs.writeFileSync(filterScript, scriptContent, 'utf8');
			fs.chmodSync(filterScript, '0755');
			try {
				const baseToUse = baseRefUsed || `${target}`;
				await gitService.filterBranchMsgFilter(
					baseToUse,
					tempBranch,
					filterScript,
				);
			} finally {
				await attempt(async () => fs.unlinkSync(mappingFile));
				await attempt(async () => fs.unlinkSync(filterScript));
			}
		} catch (e) {
			await attempt(async () => await gitService.reset({ mode: 'hard' }));
			await attempt(async () => await gitService.checkoutBranch(current));
			await attempt(async () => await gitService.deleteBranch(tempBranch));
			const msg = getErrorMessage(e);
			return {
				content: [
					{
						type: 'text',
						text: `Failed while rewriting commits: ${msg}. Backup available at tag: ${backupTag}`,
					},
				],
				structuredContent: { error: msg, replaced: 0, backupTag },
			};
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
			return {
				content: [
					{
						type: 'text',
						text: `Failed to update branch or push changes: ${msg}. Backup available at tag: ${backupTag}`,
					},
				],
				structuredContent: { error: msg, replaced: 0, backupTag },
			};
		} finally {
			await attempt(async () => await gitService.deleteBranch(tempBranch));
		}
		return {
			content: [
				{
					type: 'text',
					text: `Successfully replaced ${hashes.length} commit message(s) on branch '${current}'. Backup criado na tag: ${backupTag}`,
				},
			],
			structuredContent: { replaced: hashes.length, backupTag },
		};
	}
}
