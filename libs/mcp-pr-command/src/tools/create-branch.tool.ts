import {
	context,
	McpServer,
	Infer,
	gitService,
	contextService,
	McpResult,
} from '../internal';
import { getBranchSchema, ToolRegister } from 'src/internal';
import z from 'zod';
import { buildTextResult } from '../internal/build-result';

const inputSchema = {
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

const outputSchema = {
	branchName: z.string(),
	baseBranch: z.string(),
};

export class CreateBranchTool implements ToolRegister {
	registerTool(server: McpServer): void {
		contextService.registerTool(
			server,
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
				outputSchema,
			},
			this.createBranchHandler.bind(this),
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
	async createBranchHandler(
		params: Infer<typeof inputSchema>,
	): Promise<McpResult<typeof outputSchema>> {
		const { type, suffix, baseBranch } = params;
		const schema = getBranchSchema();

		// Determine default base branch if not provided
		const defaultBase = schema[context.branchMapping[type].origin] ?? 'main';
		const branchFrom = baseBranch || defaultBase;

		// Normalize suffix: replace spaces with dashes, lowercase
		const normalizedSuffix = suffix.trim().replace(/\s+/g, '-').toLowerCase();
		const branchName = `${type}/${normalizedSuffix}`;

		// Fetch latest from remote
		await gitService.tryFetch(branchFrom);
		// Create branch from base
		await gitService.checkoutBranch(branchName, {
			new: true,
			startPoint: `origin/${branchFrom}`,
		});

		return buildTextResult<typeof outputSchema>(
			`Branch '${branchName}' created from '${branchFrom}'.`,
			{
				branchName,
				baseBranch: branchFrom,
			},
		);
	}
}
