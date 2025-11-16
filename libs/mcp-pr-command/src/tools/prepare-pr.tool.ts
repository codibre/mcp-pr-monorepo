import {
	contextService,
	Infer,
	preparePr,
	preparePrInputSchema,
	preparePrOutputSchema,
	ToolRegister,
} from '../internal';
import { McpServer } from '../internal';

export class PreparePrTool implements ToolRegister {
	registerTool(server: McpServer): void {
		contextService.registerTool(
			server,
			'prepare-pr',
			{
				title: 'Opening or updating PR workflow, step 2: Prepare PR',
				description: `Step 2 of the PR workflow.
Prepares PR artifacts and conversational instructions based on the selected branches.
Input schema:
{
  cwd: string,           // Required. Current working directory of the repository.
  targetBranch: string,  // Required. Target branch for the PR.
  currentBranch: string, // Required. Current branch.
  cardLink?: string      // Optional. Card link.
}
Usage example:
{
  "cwd": "/home/user/my-repo",
  "targetBranch": "staging",
  "currentBranch": "mcp-pr-server",
  "cardLink": "https://tracker/card/123"
}
This step generates commit summaries, diffs, and instructions for Copilot chat to guide the user through PR creation or update.
After calling this tool, follow nextActions todo list rigourously`,
				inputSchema: preparePrInputSchema,
				outputSchema: preparePrOutputSchema,
			},
			this.preparePr.bind(this),
		);
	}

	preparePr(params: Infer<typeof preparePrInputSchema>) {
		return preparePr(params);
	}
}
