import z from 'zod';
import { execSync } from 'child_process';
import { attempt } from '../internal/attempt';
import { inferCardLinkFromBranch } from '../internal/card-link-utils';
import { ToolRegister } from 'src/internal';
import { McpServer, ToolCallback } from '../internal';

const inputSchema = {
	cwd: z
		.string()
		.min(1)
		.describe('Current working directory of the repository'),
	targetBranch: z
		.string()
		.optional()
		.describe('Optional target branch provided by the user'),
};
const outputSchema = {
	currentBranch: z.string(),
	suggestedTarget: z.string(),
	inferedCardLink: z.string().optional(),
	nextActions: z.array(z.string()),
};

export class DetectBranchesTool implements ToolRegister {
	registerTool(server: McpServer): void {
		server.registerTool(
			'detect-branches',
			{
				title: 'Opening or updating PR workflow, step 1: Detect Branches',
				description: `Step 1 of the PR workflow.
    Detects the current branch and suggests a target branch for the pull request.
    Input schema:
    {
      cwd: string // Required. Current working directory of the repository.
    }
    Usage example:
    {
      "cwd": "/home/user/my-repo"
    }
    After calling this tool, follow nextActions todo list rigourously.`,
				inputSchema,
				outputSchema,
			},
			this.detectBranches as ToolCallback<typeof inputSchema>,
		);
	}

	async detectBranches(params: { cwd: string; targetBranch?: string }) {
		const { cwd, targetBranch: providedTargetBranch } = params;
		let currentBranch = '';
		let suggestedTarget = 'staging';
		attempt(() => {
			currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
				encoding: 'utf8',
				cwd,
			}).trim();
			const allBranches = execSync('git branch', { encoding: 'utf8', cwd })
				.split('\n')
				.map((b) => b.trim().replace(/^\* /, ''))
				.filter((b) => b && b !== currentBranch);
			if (allBranches.length > 0) {
				let closestBranch = null;
				let minDistance = Infinity;
				for (const branch of allBranches) {
					try {
						const mergeBase = execSync(
							`git merge-base ${currentBranch} ${branch}`,
							{ encoding: 'utf8', cwd },
						).trim();
						if (!mergeBase) continue;
						const distance = execSync(
							`git rev-list --count ${mergeBase}..${currentBranch}`,
							{ encoding: 'utf8', cwd },
						).trim();
						const distanceNum = parseInt(distance, 10);
						if (distanceNum > 0 && distanceNum < minDistance) {
							minDistance = distanceNum;
							closestBranch = branch;
						}
					} catch {
						continue;
					}
				}
				if (closestBranch) suggestedTarget = closestBranch;
			}
		});
		const inferedCardLink = inferCardLinkFromBranch(currentBranch);
		const nextActions: string[] = [];
		if (!providedTargetBranch) {
			nextActions.push(
				'Target branch was not provided! Ask user to confirm target branch before doing anything else',
			);
			nextActions.push(
				`Suggest target branch: '${suggestedTarget}', but wait for user confirmation`,
			);
		}
		nextActions.push('Run tool prepare-pr');
		if (providedTargetBranch) suggestedTarget = providedTargetBranch;
		return {
			content: [
				{
					type: 'text',
					text: `Detected current branch: '${currentBranch}'. Suggested target branch for PR: '${suggestedTarget}'.`,
				},
			],
			structuredContent: {
				currentBranch,
				suggestedTarget,
				inferedCardLink,
				nextActions: nextActions.map((x, idx) => `${idx + 1}. ${x}`),
			},
		};
	}
}
