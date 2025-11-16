import z from 'zod';
import {
	Infer,
	ToolRegister,
	McpServer,
	getErrorMessage,
	gitService,
	contextService,
	McpResult,
} from '../internal';
import { buildTextResult } from '../internal/build-result';

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
			throw new Error('Missing required parameters: cwd, current, or target');
		}
		let gitOutput = '';
		let lastError: unknown = null;
		let found = false;
		await gitService.tryFetch(target);

		// normalize baseRef type
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
		try {
			// request full commit messages (subject + body)
			gitOutput = await gitService.logRange(params.target, params.current, {
				format: 'messages',
				currentLocal: 'local',
				targetLocal: 'remote',
			});
			found = true;
		} catch (e) {
			lastError = e;
		}
		if (!found) {
			const msg = lastError
				? getErrorMessage(lastError)
				: 'unknown error while running git log';
			throw new Error(
				`Failed to get git log: ${msg}. Ensure both branches exist and try again.`,
			);
		}
		if (!gitOutput) {
			return buildTextResult<typeof outputSchema>(
				'No commits found between the branches.',
				{ commits: [] },
			);
		}
		const entries = gitOutput
			.split('\n---ENDCOMMIT---\n')
			.map((s) => s.trim())
			.filter(Boolean);
		const messages = entries.map((entry) => {
			const lines = entry.split('\n');
			const subject = (lines[0] || '').trim();
			const body = lines
				.slice(1)
				.join('\n')
				.replace(/---ENDCOMMIT---/g, '')
				.trim();
			return (subject + (body ? '\n\n' + body : '')).trim();
		});
		return buildTextResult<typeof outputSchema>(
			`Found ${messages.length} commit(s) between ${target} and ${current}.`,
			{ commits: messages },
		);
	}
}
