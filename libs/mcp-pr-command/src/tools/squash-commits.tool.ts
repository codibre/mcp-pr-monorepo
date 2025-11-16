import z from 'zod';
import fs from 'fs/promises';
import {
	attempt,
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
} from '../internal';
import { buildTextResult } from '../internal/build-result';

const inputSchema = {
	cwd: z.string().min(1),
	current: z.string().min(1),
	target: z.string().min(1),
	commit: z.string().min(1),
};
const outputSchema = {
	squashed: z.boolean(),
	commitCount: z.number().optional(),
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
			throw new Error(
				'Faltando parâmetros obrigatórios: cwd, current, target ou commit',
			);
		}
		if (isProtectedBranch(current)) {
			const schema = getBranchSchema();
			const protectedList = Object.values(schema).join(', ');
			throw new Error(
				`Operation not allowed: the branch '${current}' is a protected branch from the schema. Only feature/fix branches can have their history altered. Protected branches: ${protectedList}`,
			);
		}
		await gitService.tryFetch(target);
		await gitService.tryFetch(current);
		// we'll check for refs both locally and on origin using refExists opts
		let baseRefUsed: string | null = null;
		let gitHashesOut = '';
		let lastErr: unknown = null;
		const baseExists = await gitService.refExists(params.target, {
			where: 'remote',
			remote: 'origin',
		});
		const headExists = await gitService.refExists(params.current, {
			where: 'local',
		});
		if (!baseExists || !headExists) {
			throw new Error(
				`Base or head reference does not exist. Check if branch '${target}' exists locally or on origin.`,
			);
		}
		try {
			gitHashesOut = await gitService.logRange(params.target, params.current, {
				format: 'hashes',
			});
			baseRefUsed = params.target;
		} catch (e) {
			lastErr = e;
		}
		if (!gitHashesOut) {
			const msg = lastErr
				? getErrorMessage(lastErr)
				: 'unknown error running git log';
			const help = `Tried refs: bases=${params.target} heads=${params.current}. Check if branch '${target}' exists locally or on origin.`;
			throw new Error(`Failed to list commits: ${msg}. ${help}`);
		}
		const hashes = gitHashesOut.split('\n').filter(Boolean);
		if (hashes.length === 0) {
			throw new Error('No commits found between branches.');
		}
		// We will rely on the remote 'origin' as the backup. Ensure the current
		// branch is pushed and in sync on origin before
		// attempting any history rewrite. This gives us a safe remote state to
		// fall back to in case the local restore path needs to update origin.
		try {
			await gitService.push('origin', current);
			// fetch the branch state from origin to ensure subsequent operations can
			// reference origin/<branch> safely.
			await gitService.fetch(current);
		} catch (e) {
			const msg = getErrorMessage(e);
			throw new Error(
				`Failed to push branch '${current}' to origin before squashing: ${msg}`,
			);
		}

		// Prevent destructive operations when the working tree contains
		// uncommitted or untracked files: squashing may rewrite history and a
		// later restore will perform a hard reset which would discard these.
		const statusOut = await gitService.statusPorcelain();
		if (statusOut && statusOut.trim().length > 0) {
			throw new Error(
				`Working tree is not clean. Please commit or stash changes and remove untracked files before squashing. 'git status --porcelain' output:\n${statusOut}`,
			);
		}
		if (hashes.length === 1) {
			try {
				await gitService.checkoutBranch(current);
				const msgFile = cwdJoin(`.git/SQUASH_MSG_${Date.now()}.txt`);
				await fs.writeFile(msgFile, newMessage, 'utf8');
				try {
					// use unified API: commit with msgFile and amend option
					await gitService.commit({ msgFile, amend: true });
				} finally {
					await attempt(() => fs.unlink(msgFile));
				}
				await gitService.push('origin', current, { force: true });
				return buildTextResult<typeof outputSchema>(
					'Single commit message updated successfully. Remote origin contains a backup of the previous state.',
					{ squashed: true, commitCount: 1 },
				);
			} catch (e) {
				const msg = getErrorMessage(e);
				await this.restoreBackup(current);
				throw new Error(`Failed to update commit message: ${msg}`);
			}
		}
		try {
			await gitService.checkoutBranch(current);
			const baseToUse = baseRefUsed || `${target}`;
			await gitService.reset({ mode: 'soft', ref: baseToUse });
			const msgFile = cwdJoin(`.git/SQUASH_MSG_${Date.now()}.txt`);
			await fs.writeFile(msgFile, newMessage, 'utf8');
			try {
				await gitService.commit({ msgFile });
			} finally {
				await attempt(() => fs.unlink(msgFile));
			}
			await gitService.push('origin', current, { force: true });
			return buildTextResult<typeof outputSchema>(
				`${hashes.length} commits were successfully combined into a single commit. Remote 'origin' contains a backup of the previous state.`,
				{ squashed: true, commitCount: hashes.length },
			);
		} catch (e) {
			const msg = getErrorMessage(e);
			await this.restoreBackup(current);
			throw new Error(`Failed to squash commits: ${msg}`);
		}
	}

	private async restoreBackup(current: string) {
		await gitService.fetch(current);

		try {
			await gitService.checkoutBranch(current);
			await gitService.reset({ mode: 'hard', ref: `origin/${current}` });
			await gitService.clean();
		} catch (e: unknown) {
			throw new Error(
				`Failed to restore local branch '${current}' from origin/${current}: ${getErrorMessage(e)}`,
			);
		}
	}
}
