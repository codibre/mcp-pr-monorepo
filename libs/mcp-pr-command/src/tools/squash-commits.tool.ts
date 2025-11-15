import z from 'zod';
import fs from 'fs';
import {
	attempt,
	createBackupTag,
	cwdJoin,
	getBranchSchema,
	getErrorMessage,
	Infer,
	isProtectedBranch,
	McpResult,
	McpServer,
	gitService,
	ToolRegister,
	contextService,
	LocalType,
} from '../internal';

const inputSchema = {
	cwd: z.string().min(1),
	current: z.string().min(1),
	target: z.string().min(1),
	commit: z.string().min(1),
};
const outputSchema = {
	squashed: z.boolean(),
	commitCount: z.number().optional(),
	backupTag: z.string().optional(),
	error: z.string().optional(),
};

export class SquashCommitsTool implements ToolRegister {
	registerTool(server: McpServer): void {
		contextService.registerTool(
			server,
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
- Discourage squashing in special branches like main, staging, production, develop, etc.
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
			this.squashCommits.bind(this),
		);
	}

	async squashCommits(
		params: Infer<typeof inputSchema>,
	): Promise<McpResult<typeof outputSchema>> {
		const { current, target, commit: newMessage } = params;
		if (!current || !target || !newMessage) {
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
		if (isProtectedBranch(current)) {
			const schema = getBranchSchema();
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
		await gitService.tryFetch(target);
		await gitService.tryFetch(current);
		// we'll check for refs both locally and on origin using refExists opts
		type RefWhere = { ref: string; where: LocalType };
		const baseCandidates: RefWhere[] = [
			{ ref: target, where: 'local' },
			{ ref: target, where: 'remote' },
		];
		const headCandidates: RefWhere[] = [
			{ ref: current, where: 'local' },
			{ ref: current, where: 'remote' },
		];
		let baseRefUsed: string | null = null;
		let gitHashesOut = '';
		let lastErr: unknown = null;
		for (const baseRef of baseCandidates) {
			for (const headRef of headCandidates) {
				// normalize ref existence using opts
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
			backupTag = await createBackupTag(current);
		} catch (e) {
			const msg = getErrorMessage(e);
			return {
				content: [{ type: 'text', text: `Falha ao criar backup: ${msg}` }],
				structuredContent: { error: msg, squashed: false },
			};
		}
		if (hashes.length === 1) {
			try {
				await gitService.checkoutBranch(current);
				const msgFile = cwdJoin(`.git/SQUASH_MSG_${Date.now()}.txt`);
				fs.writeFileSync(msgFile, newMessage, 'utf8');
				try {
					// use unified API: commit with msgFile and amend option
					await gitService.commit({ msgFile, amend: true });
				} finally {
					attempt(() => fs.unlinkSync(msgFile));
				}
				await gitService.push('origin', current, { force: true });
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
				// Attempt to restore the branch to the backup tag (best-effort)
				await attempt(async () => {
					if (backupTag) {
						// Force the branch to the backup tag and push to remote
						await gitService.branchForceUpdate(current, backupTag);
						await gitService.push('origin', current, { force: true });
					}
				});
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
			await gitService.checkoutBranch(current);
			const baseToUse = baseRefUsed || `${target}`;
			await gitService.reset({ mode: 'soft', ref: baseToUse });
			const msgFile = cwdJoin(`.git/SQUASH_MSG_${Date.now()}.txt`);
			fs.writeFileSync(msgFile, newMessage, 'utf8');
			try {
				await gitService.commit({ msgFile });
			} finally {
				attempt(() => fs.unlinkSync(msgFile));
			}
			await gitService.push('origin', current, { force: true });
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
			// Attempt to restore the branch to the backup tag (best-effort)
			await attempt(async () => {
				if (backupTag) {
					await gitService.branchForceUpdate(current, backupTag);
					await gitService.push('origin', current, { force: true });
				}
			});
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
