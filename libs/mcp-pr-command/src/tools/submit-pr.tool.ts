import z from 'zod';
import { execSync } from 'child_process';
import {
	clearTempDir,
	createTempFile,
	normalizePath,
	ToolRegister,
} from '../internal';
import { attempt } from '../internal/attempt';
import { getErrorMessage } from '../internal/get-error-message';
import { branchExistsLocally } from '../internal/git-utils';
import { Nullable } from 'is-this-a-pigeon';
import { McpServer, ToolCallback } from '../internal';

const inputSchema = {
	cwd: z
		.string()
		.min(1)
		.describe('Current working directory of the repository'),
	prNumber: z.number().optional(),
	title: z.string(),
	body: z.string(),
	targetBranch: z.string(),
	currentBranch: z.string(),
	deleteTempDir: z.boolean().default(true),
};
const outputSchema = {
	prUrl: z.string().nullable(),
	nextActions: z.array(z.string()),
};

export class SubmitPrTool implements ToolRegister {
	registerTool(server: McpServer): void {
		server.registerTool(
			'submit-pr',
			{
				title: 'Opening or updating PR workflow, step 3: Submit PR',
				description: `Step 3 of the PR workflow.
Creates or updates the pull request on the remote repository using the provided title, body, and branch information.
After completing operation:
  - Print PR URL, if returned, to the user;
  - IF MCP for card app/website is available, add a comment to the card with the PR link. The link must be set as a <a> tag to be clickable.
Input schema:
{
  cwd: string,           // Required. Current working directory of the repository.
  prNumber?: number,     // Optional. PR number if updating, null for new PR.
  title: string,         // Required. PR title.
  body: string,          // Required. PR body/description.
  targetBranch: string,  // Required. Target branch.
  currentBranch: string  // Required. Current branch.
}
Usage example:
{
  "cwd": "/home/user/my-repo",
  "prNumber": null,
  "title": "feat: Add MCP PR server",
  "body": "Implements MCP server for local PR generation.",
  "targetBranch": "staging",
  "currentBranch": "mcp-pr-server"
}
`,
				inputSchema,
				outputSchema,
			},
			this.submitPr as ToolCallback<typeof inputSchema>,
		);
	}

	async submitPr(params: {
		cwd: string;
		prNumber?: number | null;
		title: string;
		body: string;
		targetBranch: string;
		currentBranch: string;
		deleteTempDir?: boolean;
	}) {
		const {
			prNumber = null,
			title,
			body,
			targetBranch,
			currentBranch,
			deleteTempDir = true,
		} = params;
		const cwd = normalizePath(params.cwd);
		if (!title || !body || !targetBranch || !currentBranch) {
			return {
				content: [
					{
						type: 'text',
						text: 'Missing required parameters: title, body, targetBranch, or currentBranch.',
					},
				],
			};
		}

		// Check if the branch exists locally and push if it does
		// Push using refspec syntax (works regardless of current branch and uncommitted changes)
		if (branchExistsLocally(currentBranch, cwd)) {
			try {
				try {
					execSync(
						`git push origin refs/heads/${currentBranch}:refs/heads/${currentBranch}`,
						{ encoding: 'utf8', cwd },
					);
				} catch {
					execSync(
						`git push --set-upstream origin refs/heads/${currentBranch}:refs/heads/${currentBranch}`,
						{
							encoding: 'utf8',
							cwd,
						},
					);
				}
			} catch (e) {
				const pushError = getErrorMessage(e);
				throw new Error(
					`Failed to push branch '${currentBranch}' to origin.

Error: ${pushError}

Please check:
1. You have write permissions to the remote repository
2. The remote 'origin' is correctly configured (run: git remote -v)
3. There are no conflicts with the remote branch
4. Your network connection is stable

If the branch is protected, you may need to:
- Push directly if you have the required permissions
- Create the PR from an existing remote branch
- Contact a repository administrator for access`,
				);
			}
		}
		let prUrl: string | null = null;
		const prBodyFile = await createTempFile(
			`.copilot-pr-body-${prNumber}-${Date.now()}.md`,
			body,
			cwd,
		);
		if (prNumber) {
			const prView = execSync(`gh pr view ${prNumber} --json url`, {
				encoding: 'utf8',
				cwd,
			}).trim();
			attempt(() => {
				prUrl = (JSON.parse(prView) as Nullable<{ url: string }>)?.url ?? null;
			});
			execSync(
				`gh pr edit ${prNumber} --title "${title}" --body-file "${prBodyFile}"`,
				{ encoding: 'utf8', cwd },
			);
		} else {
			const prCreateOut = execSync(
				`gh pr create --base ${targetBranch} --head ${currentBranch} --title "${title}" --body-file "${prBodyFile}"`,
				{ encoding: 'utf8', cwd },
			);
			const urlMatch = prCreateOut.match(
				/https:\/\/github\.com\/[\w-]+\/[\w-]+\/pull\/\d+/,
			);
			prUrl = urlMatch ? urlMatch[0] : null;
		}
		if (deleteTempDir) await clearTempDir(cwd);
		return {
			content: [
				{
					type: 'text',
					text: `Operation successful.${prUrl ? ` PR URL: ${prUrl}` : ''}`,
				},
			],
			structuredContent: {
				prUrl,
				nextActions: [
					'1. Print PR URL, if returned, to the user',
					'2. IF MCP for card app/website is available, add a comment to the card with the PR link.',
				],
			},
		};
	}
}
