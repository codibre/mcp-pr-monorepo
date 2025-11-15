import z from 'zod';
import {
	Infer,
	ToolRegister,
	McpServer,
	attempt,
	getErrorMessage,
	gitService,
	contextService,
	McpResult,
	LocalType,
} from '../internal';

const SLICE_POSITION = 3;

const inputSchema = {
	cwd: z.string().min(1),
	current: z.string().min(1),
	target: z.string().min(1),
};
const outputSchema = {
	commits: z.array(z.string()),
	error: z.string().optional(),
};

export class GetCommitMessagesTool implements ToolRegister {
	registerTool(server: McpServer): void {
		contextService.registerTool(
			server,
			'get-commit-messages',
			{
				title: 'Get commit messages between branches',
				description: `Returns an array containing the full commit messages (title and body) in the difference between two branches.
Input schema:
{
  cwd: string,
  current: string,
  target: string
}
`,
				inputSchema,
				outputSchema,
			},
			this.getCommitMessages.bind(this),
		);
	}

	async getCommitMessages(
		params: Infer<typeof inputSchema>,
	): Promise<McpResult<typeof outputSchema>> {
		const { current, target } = params;
		if (!current || !target) {
			return {
				content: [
					{
						type: 'text',
						text: 'Missing required parameters: cwd, current, or target',
					},
				],
			};
		}
		type RefWhere = { ref: string; where: LocalType };
		const baseCandidates: Array<string | RefWhere> = [
			{ ref: target, where: 'remote' },
			{ ref: target, where: 'local' },
			{ ref: 'HEAD', where: 'remote' },
		];
		const headCandidates: RefWhere[] = [
			{ ref: current, where: 'local' },
			{ ref: current, where: 'remote' },
		];
		let gitOutput = '';
		let lastError: unknown = null;
		let found = false;
		const tryFind = async () => {
			for (const baseRef of baseCandidates) {
				for (const headRef of headCandidates) {
					// normalize baseRef type
					let baseExists = false;
					let baseExpr = '';
					if (typeof baseRef === 'string') {
						baseExists = await gitService.refExists(baseRef, {
							where: 'remote',
							remote: 'origin',
						});
						baseExpr = baseRef;
					} else {
						baseExists = await gitService.refExists(baseRef.ref, {
							where: baseRef.where,
							remote: baseRef.where === 'remote' ? 'origin' : undefined,
						});
						baseExpr = baseRef.ref;
					}
					const headExists = await gitService.refExists(headRef.ref, {
						where: headRef.where,
						remote: headRef.where === 'remote' ? 'origin' : undefined,
					});
					if (!baseExists || !headExists) continue;
					try {
						// request full commit messages (subject + body)
						gitOutput = await gitService.logRange(
							baseExpr,
							headRef.where === 'remote' ? headRef.ref : headRef.ref,
							{
								format: 'messages',
							},
						);
						found = true;
						return;
					} catch (e) {
						lastError = e;
					}
				}
			}
		};
		await tryFind();
		if (!found) {
			await gitService.tryFetch(target);
			await gitService.tryFetch(current);
			await attempt(async () => {
				let originHead = null;
				try {
					const sym = await gitService.symbolicRefQuiet(
						'refs/remotes/origin/HEAD',
					);
					const parts = sym.split('/');
					originHead = parts.slice(SLICE_POSITION).join('/');
				} catch {
					originHead = null;
				}
				if (originHead) {
					baseCandidates.unshift({ ref: originHead, where: 'remote' });
					baseCandidates.unshift({ ref: originHead, where: 'local' });
				}
			});
			await tryFind();
		}
		if (!found) {
			const msg = lastError
				? getErrorMessage(lastError)
				: 'unknown error while running git log';
			const help = `Tried refs: bases=${baseCandidates.join(', ')} heads=${headCandidates.join(', ')}. Ensure the target branch exists locally or on origin.`;
			return {
				content: [
					{ type: 'text', text: `Failed to get git log: ${msg}. ${help}` },
				],
				structuredContent: { error: msg, commits: [] },
			};
		}
		if (!gitOutput) {
			return {
				content: [
					{ type: 'text', text: 'No commits found between the branches.' },
				],
				structuredContent: { commits: [] },
			};
		}
		const entries = gitOutput
			.split('\n---ENDCOMMIT---\n')
			.map((s) => s.trim())
			.filter(Boolean);
		const messages = entries.map((entry) => {
			const lines = entry.split('\n');
			const bodyLines = lines.slice(1);
			return bodyLines
				.join('\n')
				.replace(/---ENDCOMMIT---/g, '')
				.trim();
		});
		return {
			content: [
				{
					type: 'text',
					text: `Found ${messages.length} commit(s) between ${target} and ${current}.`,
				},
			],
			structuredContent: { commits: messages },
		};
	}
}
