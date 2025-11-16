import z from 'zod';
import {
	Infer,
	ToolRegister,
	attempt,
	inferCardLinkFromBranch,
	normalizePath,
	gitService,
	contextService,
	McpResult,
} from 'src/internal';
import { McpServer } from '../internal';
import { buildTextResult } from '../internal/build-result';

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
		contextService.registerTool(
			server,
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
			this.detectBranches.bind(this),
		);
	}

	async detectBranches(
		params: Infer<typeof inputSchema>,
	): Promise<McpResult<typeof outputSchema>> {
		const { targetBranch: providedTargetBranch } = params;
		await normalizePath(params.cwd);
		let currentBranch = '';
		let suggestedTarget = 'staging';
		await attempt(async () => {
			currentBranch = await gitService.revParseAbbrevRef();
			const allBranches = (await gitService.listBranches()).filter(
				(b) => b && b !== currentBranch,
			);
			if (allBranches.length > 0) {
				let closestBranch: string | null = null;
				let minDistance = Infinity;
				for (const branch of allBranches) {
					try {
						const mergeBase = await gitService.mergeBase(currentBranch, branch);
						if (!mergeBase) continue;
						const distanceNum = await gitService.revListCountBetween(
							mergeBase,
							currentBranch,
						);
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
		return buildTextResult<typeof outputSchema>(
			`Detected current branch: '${currentBranch}'. Suggested target branch for PR: '${suggestedTarget}'.`,
			{
				currentBranch,
				suggestedTarget,
				inferedCardLink,
				nextActions: nextActions.map((x, idx) => `${idx + 1}. ${x}`),
			},
		);
	}
}
