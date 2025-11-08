import z from 'zod';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
	createBackupTag,
	getBranchSchema,
	isProtectedBranch,
	ToolRegister,
} from '../internal';
import { attempt } from '../internal/attempt';
import { getErrorMessage } from '../internal/get-error-message';
import { McpServer, ToolCallback } from '../internal';

const inputSchema: z.ZodRawShape = {
	cwd: z.string().min(1),
	current: z.string().min(1),
	target: z.string().min(1),
	commit: z.string().min(1),
};
const outputSchema: z.ZodRawShape = {
	squashed: z.boolean(),
	commitCount: z.number().optional(),
	backupTag: z.string().optional(),
	error: z.string().optional(),
};

export class SquashCommitsTool implements ToolRegister {
	registerTool(server: McpServer): void {
		server.registerTool(
			'squash-commits',
			{
				title: 'Squash all commits between two branches into one',
				description: `Squashes all commits between target and current into a single commit with the provided message.
Input schema:
{
  cwd: string,
  current: string,
  target: string,
  commit: string
}
IMPORTANT:
- Check all commits messages before squashing them to make a good new commit message. For that, use get-commit-messages first.
- If repo uses commitlint, ensure that the new commit message complies with the rules to avoid push rejections. Check commitlint.config.js or .commitlintrc.js for the rules used in the repository.
- Discourage squashing in special branches like main, staging, production, develop, etc. Check branches.ini if available for special branch names.
- The commit message should be descriptive enough for changelogs generation and for other tools that may use it.
- The type of the commit message (feat, fix, chore, etc.)
  - Should be feat if there's at least one feat commit.
  - If not, should be fix if there's at least one fix commit.
  - Otherwise, use the most common type among the commits being squashed.
- The title of the commit message should summarize the main changes made in the squashed commits.
- The body of the commit message can include a more detailed description of the changes, and must NEVER be just a concatenation of the original commit messages.
`,
				inputSchema,
				outputSchema,
			},
			this.squashCommits as ToolCallback<typeof inputSchema>,
		);
	}

	async squashCommits(params: {
		cwd: string;
		current: string;
		target: string;
		commit: string;
	}) {
		const { cwd, current, target, commit: newMessage } = params;
		if (!cwd || !current || !target || !newMessage) {
			return {
				content: [
					{
						type: 'text',
						text: 'Faltando parâmetros obrigatórios: cwd, current, target ou commit',
					},
				],
				structuredContent: { error: 'invalid_input', squashed: false },
			};
		}
		if (isProtectedBranch(current, cwd)) {
			const schema = getBranchSchema(cwd);
			const protectedList = Object.values(schema).join(', ');
			return {
				content: [
					{
						type: 'text',
						text: `Operação não permitida: a branch '${current}' é uma branch protegida do schema. Apenas branches de feature/fix podem ter o histórico alterado. Branches protegidas: ${protectedList}`,
					},
				],
				structuredContent: { error: 'protected_branch', squashed: false },
			};
		}
		function refExists(ref: string) {
			try {
				execSync(`git rev-parse --verify --quiet ${ref}`, {
					encoding: 'utf8',
					cwd,
				});
				return true;
			} catch {
				return false;
			}
		}
		attempt(() =>
			execSync(`git fetch origin ${target}`, { encoding: 'utf8', cwd }),
		);
		attempt(() =>
			execSync(`git fetch origin ${current}`, { encoding: 'utf8', cwd }),
		);
		const baseCandidates = [`origin/${target}`, `${target}`];
		const headCandidates = [`${current}`, `origin/${current}`];
		let baseRefUsed: string | null = null;
		let gitHashesOut = '';
		let lastErr: unknown = null;
		for (const baseRef of baseCandidates) {
			for (const headRef of headCandidates) {
				if (!refExists(baseRef) || !refExists(headRef)) continue;
				const rangeTry = `${baseRef}..${headRef}`;
				try {
					gitHashesOut = execSync(`git log ${rangeTry} --pretty=format:'%H'`, {
						encoding: 'utf8',
						cwd,
					}).trim();
					baseRefUsed = baseRef;
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
				: 'erro desconhecido ao executar git log';
			const help = `Tentei refs: bases=${baseCandidates.join(', ')} heads=${headCandidates.join(', ')}. Verifique se a branch '${target}' existe localmente ou no origin.`;
			return {
				content: [
					{ type: 'text', text: `Falha ao listar commits: ${msg}. ${help}` },
				],
				structuredContent: { error: msg, squashed: false },
			};
		}
		const hashes = gitHashesOut.split('\n').filter(Boolean);
		if (hashes.length === 0) {
			return {
				content: [
					{ type: 'text', text: 'Nenhum commit encontrado entre as branches.' },
				],
				structuredContent: { error: 'no_commits', squashed: false },
			};
		}
		let backupTag;
		try {
			backupTag = createBackupTag(current, cwd);
		} catch (e) {
			const msg = getErrorMessage(e);
			return {
				content: [{ type: 'text', text: `Falha ao criar backup: ${msg}` }],
				structuredContent: { error: msg, squashed: false },
			};
		}
		if (hashes.length === 1) {
			try {
				execSync(`git checkout ${current}`, { encoding: 'utf8', cwd });
				const msgFile = path.join(cwd, `.git/SQUASH_MSG_${Date.now()}.txt`);
				fs.writeFileSync(msgFile, newMessage, 'utf8');
				try {
					execSync(`git commit --amend -F "${msgFile}"`, {
						encoding: 'utf8',
						cwd,
					});
				} finally {
					attempt(() => fs.unlinkSync(msgFile));
				}
				execSync(`git push --force origin ${current}`, {
					encoding: 'utf8',
					cwd,
				});
				return {
					content: [
						{
							type: 'text',
							text: `Mensagem do único commit atualizada com sucesso. Backup criado na tag: ${backupTag}`,
						},
					],
					structuredContent: { squashed: true, commitCount: 1, backupTag },
				};
			} catch (e) {
				const msg = getErrorMessage(e);
				return {
					content: [
						{
							type: 'text',
							text: `Falha ao atualizar mensagem do commit: ${msg}. Backup disponível em tag: ${backupTag}`,
						},
					],
					structuredContent: { error: msg, squashed: false, backupTag },
				};
			}
		}
		try {
			execSync(`git checkout ${current}`, { encoding: 'utf8', cwd });
			const baseToUse = baseRefUsed || `${target}`;
			execSync(`git reset --soft ${baseToUse}`, { encoding: 'utf8', cwd });
			const msgFile = path.join(cwd, `.git/SQUASH_MSG_${Date.now()}.txt`);
			fs.writeFileSync(msgFile, newMessage, 'utf8');
			try {
				execSync(`git commit -F "${msgFile}"`, { encoding: 'utf8', cwd });
			} finally {
				attempt(() => fs.unlinkSync(msgFile));
			}
			execSync(`git push --force origin ${current}`, { encoding: 'utf8', cwd });
			return {
				content: [
					{
						type: 'text',
						text: `${hashes.length} commits foram combinados em um único commit com sucesso. Backup criado na tag: ${backupTag}`,
					},
				],
				structuredContent: {
					squashed: true,
					commitCount: hashes.length,
					backupTag,
				},
			};
		} catch (e) {
			const msg = getErrorMessage(e);
			return {
				content: [
					{
						type: 'text',
						text: `Falha ao fazer squash dos commits: ${msg}. Backup disponível em tag: ${backupTag}`,
					},
				],
				structuredContent: { error: msg, squashed: false, backupTag },
			};
		}
	}
}
