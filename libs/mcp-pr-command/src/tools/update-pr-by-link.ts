import {
	contextService,
	ghClient,
	Infer,
	McpServer,
	preparePr,
	preparePrOutputSchema,
} from '../internal';
import { getErrorMessage, ToolRegister } from 'src/internal';
import { assertNonNullish, Nullable } from 'is-this-a-pigeon';
import z from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';

const inputSchema = {
	cwd: z
		.string()
		.min(1)
		.describe('Current working directory of the repository'),
	prUrl: z.string().min(1).describe('Full URL of the PR to update'),
};
export class UpdatePRByLinkTool implements ToolRegister {
	registerTool(server: McpServer): void {
		contextService.registerTool(
			server,
			'update-pr-by-link',
			{
				title: 'Update PR by providing its URL',
				description: `Updates an existing PR by fetching its details from the provided URL.
This tool automatically:
1. Extracts the PR number from the URL
2. Fetches the PR details (head branch, base branch)
3. Executes the prepare-pr logic (step 2)
4. Returns the same data as step 2 for the orchestrator to show to the user

IMPORTANT: Use this tool only when the user provides a PR URL to update an existing PR.
If user just asks to open a new PR, do not use this tool, use detect-branches and prepare-pr instead.

After calling this tool, follow the same nextActions as step 2 (prepare-pr).

Input schema:
{
  cwd: string,    // Required. Current working directory of the repository.
  prUrl: string   // Required. Full URL of the PR to update (e.g., https://github.com/owner/repo/pull/123)
}

Usage example:
{
  "cwd": "/home/user/my-repo",
  "prUrl": "https://github.com/codibre/mcrp-pr-monorepo/pull/123"
}`,
				inputSchema,
				outputSchema: preparePrOutputSchema,
			},
			this.updatePrByLinkHandler.bind(this),
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
	async updatePrByLinkHandler(
		params: Infer<typeof inputSchema>,
	): Promise<CallToolResult> {
		const { prUrl } = params;

		// Extract PR number from URL
		const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
		if (!prNumberMatch?.[1]) {
			return {
				content: [
					{
						type: 'text',
						text: 'Invalid PR URL. Could not extract PR number.',
					},
				],
				structuredContent: { error: 'Invalid PR URL' },
			};
		}

		const prNumber = parseInt(prNumberMatch[1], 10);

		// Get PR details to extract branches
		let prDetailsUnknown: unknown;
		try {
			prDetailsUnknown = ghClient.prView(prNumber, [
				'headRefName',
				'baseRefName',
				'title',
				'body',
			]);
		} catch (error) {
			const message = getErrorMessage(error);
			return {
				content: [
					{
						type: 'text',
						text: `Failed to fetch PR #${prNumber} details: ${message}`,
					},
				],
				structuredContent: { error: `Failed to fetch PR details: ${message}` },
			};
		}
		const prDetails: Nullable<{
			headRefName: string;
			baseRefName: string;
			title: string;
			body: string;
		}> = prDetailsUnknown as Nullable<{
			headRefName: string;
			baseRefName: string;
			title: string;
			body: string;
		}>;
		assertNonNullish(prDetails, 'PR details should be defined');
		const currentBranch = prDetails.headRefName;
		const targetBranch = prDetails.baseRefName;

		// Execute prepare-pr logic
		const prepareResult = await preparePr({
			targetBranch,
			currentBranch,
			cardLink: '',
		});

		return {
			content: [
				{
					type: 'text',
					text: `Fetched PR #${prNumber} details. Head branch: '${currentBranch}', Base branch: '${targetBranch}'. Ready to update.`,
				},
			],
			structuredContent: {
				prNumber,
				currentBranch,
				targetBranch,
				...prepareResult.structuredContent,
			},
		};
	}
}
