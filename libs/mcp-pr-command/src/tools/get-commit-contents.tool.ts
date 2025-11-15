import z from 'zod';
import {
	contextService,
	generateChangesFile,
	getErrorMessage,
	Infer,
	McpResult,
	McpServer,
	ToolRegister,
} from '../internal';

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
		contextService.registerTool(
			server,
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
			this.getCommitContents.bind(this),
		);
	}

	async getCommitContents(
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
				structuredContent: { error: 'invalid_input' },
			};
		}
		try {
			const changesFile = await generateChangesFile(target, current);
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
