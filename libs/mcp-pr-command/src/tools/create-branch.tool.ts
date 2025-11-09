import { context, McpServer, ToolCallback } from '../internal';
import { getBranchSchema, ToolRegister } from 'src/internal';
import { execSync } from 'child_process';
import z from 'zod';
import { ChangingBranchType } from 'src/mcp-pr-command-options';

const inputSchema: z.ZodRawShape = {
	type: z
		.enum(['feat', 'fix', 'hotfix', 'release'])
		.describe('Type of branch to create: feat, fix, hotfix or release'),
	suffix: z
		.string()
		.min(1)
		.describe(
			'Suffix for the branch name, e.g., card number or short description',
		),
	baseBranch: z
		.string()
		.optional()
		.describe(
			'Optional base branch to create the new branch from. If not informed will be chosen based on branch schema. Only inform this if user explicitly requests so.',
		),
	cwd: z
		.string()
		.min(1)
		.describe('Current working directory of the repository'),
};
export class CreateBranchTool implements ToolRegister {
	registerTool(server: McpServer): void {
		server.registerTool(
			'create-branch',
			{
				title: 'Create a feat/fix branch for a given card',
				description: `Create the given branch based on homologation branch or production branching,
depending on type (feat/fix/hotfix).
You should only use this method if you want to explicitly create a branch, never to open a PR
If a MCP that gets card info is available and prompt asks to create branch from that card,
use it to determine branch name and type (feat/fix/hotfix).
- When creating branch name from a card, respect any format specified in .github/copilot-instructions.md, if any
- If no template is specified, use the following format: type/cardNumber-boardNumber-short-description.
- Branches with no card and no requested name must use format: release/YYYYMMDD
- Short description may be extracted from card title and content, if available, but don't use more than 10 words, and avoid special characters.
- Notice type and the rest of the branch name must be separated by a slash (/), not by a dash (-).
If type is specified within user prompt, use that instead.

This examples are the defualt branch schema, too. You can inform the user
of this default values if questioned about it.

IMPORTANT: If user requests to open a PR, don't use this tool, as he's already positioned in the correct branch.
`,
				inputSchema,
			},
			this.createBranchHandler as ToolCallback<typeof inputSchema>,
		);
	}

	// Update PR by link
	/**
	 * Update PR by link
	 * Input schema:
	 * {
	 *   cwd: string,    // Required. Current working directory of the repository.
	 *   prUrl: string   // Required. URL of the PR to update.
	 * }
	 */
	async createBranchHandler(params: {
		type: ChangingBranchType;
		suffix: string;
		baseBranch?: string;
		cwd: string;
	}) {
		const { type, suffix, baseBranch, cwd } = params;
		const schema = getBranchSchema(cwd);

		// Determine default base branch if not provided
		const defaultBase = schema[context.branchMapping[type].origin] ?? 'main';
		const branchFrom = baseBranch || defaultBase;

		// Normalize suffix: replace spaces with dashes, lowercase
		const normalizedSuffix = suffix.trim().replace(/\s+/g, '-').toLowerCase();
		const branchName = `${type}/${normalizedSuffix}`;

		// Fetch latest from remote
		execSync(`git fetch origin ${branchFrom}`, { encoding: 'utf8', cwd });
		// Create branch from base
		execSync(`git checkout -b ${branchName} origin/${branchFrom}`, {
			encoding: 'utf8',
			cwd,
		});

		return {
			content: [
				{
					type: 'text',
					text: `Branch '${branchName}' created from '${branchFrom}'.`,
				},
			],
			structuredContent: {
				branchName,
				baseBranch: branchFrom,
			},
		};
	}
}
