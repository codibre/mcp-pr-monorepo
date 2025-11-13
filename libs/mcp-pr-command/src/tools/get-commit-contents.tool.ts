import z from 'zod';
import { generateChangesFile, normalizePath } from '../internal';
import { getErrorMessage } from '../internal/get-error-message';
import { ToolRegister } from 'src/internal';
import { McpServer, ToolCallback } from '../internal';

const inputSchema = {
	cwd: z
		.string()
		.min(1)
		.describe('Current working directory of the repository'),
	current: z.string().min(1).describe('Current branch name'),
	target: z.string().min(1).describe('Target branch name'),
};

const outputSchema = {
	changesFile: z.string().optional(),
	error: z.string().optional(),
};

export class GetCommitContentsTool implements ToolRegister {
	registerTool(server: McpServer): void {
		server.registerTool(
			'get-commit-contents',
			{
				title: 'Get commit contents file between branches',
				description: `Generates and returns the path to a file containing commits, diff summary, and code diff between two branches.
Input schema:
{
  cwd: string,
  current: string,
  target: string
}
The returned file contains:
- All commit messages
- Diff summary (files changed statistics)
- Full code diff
`,
				inputSchema,
				outputSchema,
			},
			this.getCommitContents as ToolCallback<typeof inputSchema>,
		);
	}

	async getCommitContents(params: {
		cwd: string;
		current: string;
		target: string;
	}) {
		const { current, target } = params;
		const cwd = normalizePath(params.cwd);
		if (!cwd || !current || !target) {
			return {
				content: [
					{
						type: 'text',
						text: 'Missing required parameters: cwd, current, or target',
					},
				],
				structuredContent: { error: 'invalid_input' },
			};
		}
		try {
			const changesFile = await generateChangesFile(target, current, cwd);
			return {
				content: [
					{ type: 'text', text: `Changes file generated at: ${changesFile}` },
				],
				structuredContent: { changesFile },
			};
		} catch (error) {
			const msg = getErrorMessage(error);
			return {
				content: [
					{ type: 'text', text: `Failed to generate changes file: ${msg}` },
				],
				structuredContent: { error: msg },
			};
		}
	}
}
