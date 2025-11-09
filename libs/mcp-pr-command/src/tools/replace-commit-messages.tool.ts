import z from 'zod';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
	createBackupTag,
	getBranchSchema,
	isProtectedBranch,
	ToolRegister,
} from '../internal';
import { attempt } from '../internal/attempt';
import { getErrorMessage } from '../internal/get-error-message';
import { McpServer, ToolCallback } from '../internal';

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
		server.registerTool(
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
Discourage refactoring changes in special branches, like main, staging, production, develop, etc. Check branches.ini if available for special branch names.
Commits must have good description for changelogs generation and for other tools that may use them.
`,
				inputSchema,
				outputSchema,
			},
			this.replaceCommitMessages as ToolCallback<typeof inputSchema>,
		);
	}
	async replaceCommitMessages(params: {
		cwd: string;
		current: string;
		target: string;
		commits: string[];
	}) {
		const { cwd, current, target, commits: newMessages } = params;
		if (!cwd || !current || !target || !Array.isArray(newMessages)) {
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
		if (isProtectedBranch(current, cwd)) {
			const schema = getBranchSchema(cwd);
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
		const baseCandidates = [`origin/${target}`, `${target}`];
		const headCandidates = [`${current}`, `origin/${current}`];
		let gitHashesOut = '';
		let baseRefUsed: string | null = null;
		let headRefUsed: string | null = null;
		let lastErr: unknown = null;
		for (const baseRef of baseCandidates) {
			for (const headRef of headCandidates) {
				const rangeTry = `${baseRef}..${headRef}`;
				try {
					gitHashesOut = execSync(
						`git log ${rangeTry} --pretty=format:'%H%n---END---'`,
						{ encoding: 'utf8', cwd },
					).trim();
					baseRefUsed = baseRef;
					headRefUsed = headRef;
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
			backupTag = createBackupTag(current, cwd);
		} catch (e) {
			const msg = getErrorMessage(e);
			return {
				content: [{ type: 'text', text: `Failed to create backup: ${msg}` }],
				structuredContent: { error: msg, replaced: 0 },
			};
		}
		const tempBranch = `temp/rewrite-messages-${Date.now()}`;
		try {
			execSync(`git fetch origin ${target}`, { encoding: 'utf8', cwd });
			attempt(() =>
				execSync(`git fetch origin ${current}`, { encoding: 'utf8', cwd }),
			);
			const createFrom = headRefUsed || current;
			execSync(`git checkout -b ${tempBranch} ${createFrom}`, {
				encoding: 'utf8',
				cwd,
			});
		} catch (e) {
			attempt(() =>
				execSync(`git tag -d ${backupTag}`, { encoding: 'utf8', cwd }),
			);
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
			const mappingFile = path.join(
				cwd,
				`.git/COMMIT_MSG_MAPPING_${Date.now()}.json`,
			);
			const mapping: Record<string, string> = {};
			for (let i = 0; i < applyOrder.length; i++) {
				const hash = applyOrder[i];
				if (!hash) continue;
				const newMsg = (messagesInApplyOrder[i] || '')
					.replace(/\r\n/g, '\n')
					.trim();
				let currentMsg = '';
				try {
					currentMsg = execSync(`git show -s --format=%B ${hash}`, {
						encoding: 'utf8',
						cwd,
					})
						.replace(/\r\n/g, '\n')
						.trim();
				} catch {
					currentMsg = '';
				}
				if (newMsg !== currentMsg) {
					mapping[hash] = messagesInApplyOrder[i] || '';
				}
			}
			if (Object.keys(mapping).length === 0) {
				attempt(() =>
					execSync(`git checkout ${current}`, { encoding: 'utf8', cwd }),
				);
				attempt(() =>
					execSync(`git branch -D ${tempBranch}`, { encoding: 'utf8', cwd }),
				);
				attempt(() =>
					execSync(`git tag -d ${backupTag}`, { encoding: 'utf8', cwd }),
				);
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
			const filterScript = path.join(cwd, `.git/msg-filter-${Date.now()}.sh`);
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
				const baseToUse = baseRefUsed || `origin/${target}`;
				const range = `${baseToUse}..${tempBranch}`;
				execSync(
					`git filter-branch -f --msg-filter "${filterScript}" ${range}`,
					{ encoding: 'utf8', cwd, stdio: 'pipe' },
				);
			} finally {
				attempt(() => fs.unlinkSync(mappingFile));
				attempt(() => fs.unlinkSync(filterScript));
			}
		} catch (e) {
			attempt(() => execSync('git reset --hard', { encoding: 'utf8', cwd }));
			attempt(() =>
				execSync(`git checkout ${current}`, { encoding: 'utf8', cwd }),
			);
			attempt(() =>
				execSync(`git branch -D ${tempBranch}`, { encoding: 'utf8', cwd }),
			);
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
			const newHead = execSync('git rev-parse HEAD', {
				encoding: 'utf8',
				cwd,
			}).trim();
			execSync(`git branch -f ${current} ${newHead}`, {
				encoding: 'utf8',
				cwd,
			});
			execSync(`git checkout ${current}`, { encoding: 'utf8', cwd });
			execSync(`git push --force origin ${current}`, { encoding: 'utf8', cwd });
		} catch (e) {
			attempt(() =>
				execSync(`git checkout ${current}`, { encoding: 'utf8', cwd }),
			);
			attempt(() =>
				execSync(`git branch -D ${tempBranch}`, { encoding: 'utf8', cwd }),
			);
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
			attempt(() =>
				execSync(`git branch -D ${tempBranch}`, { encoding: 'utf8', cwd }),
			);
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
