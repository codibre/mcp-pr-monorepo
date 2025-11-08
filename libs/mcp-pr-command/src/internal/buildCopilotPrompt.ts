import { Nullable } from 'is-this-a-pigeon';
import { context } from './context';

const commonInstructions = `
## GENERAL INSTRUCTIONS
- PR must be written in ${context.language ?? "same language of project's README.MD"}, unless specified otherwise in .github/copilot-instructions.md
- ALWAYS respect PR template when present.
- If current PR exists, use its content as context, but enforce PR template. Maybe current pr is not following it
- Focus on intent and user-visible impact (what changed and why)
## DESCRIPTION AND TITLE INSTRUCTIONS:
- Explain the change made based on commit messages and diff provided
- Title must be concise, single-line summary with no special characters.
- Context of the problem being solved must be included
## COMMIT FORMATTING INSTRUCTIONS:
- Omit trivial commits (e.g. 'fix lint') EXCEPT merge commits that reference PRs with useful context
- For commits referencing PRs (e.g. "Merge pull request #123"), ALWAYS preserve the PR reference in the summary
- Format as bullet points with '- ' (no hashes, no extra markup)
## CARD LINK INSTRUCTIONS:
- When having a pr template with a strong link placeholder, try to comply to suggested format
  - Example of place holder: [#TASK_NUMBER](https://link.com/ctrl_board/BOARD_NUMBER/cards/TASK_NUMBER/details/). In this case, extract TASK_NUMBER from url to fill the place holder
  - If a undocumented pattern is found, try to follow it as best as possible
- Information from cards must be fetch from Kanbanize and included in the PR description
  - Summarize only the relevant parts if the description is too long
  - Respect template structure when adding card links.
  - Card information may go just below card link.
-
`;

export function buildCopilotPrompt({
	prTemplate,
	existingPRContent,
	changesFile,
}: {
	prTemplate?: Nullable<string>;
	existingPRContent?: Nullable<{ title: string; body: string }>;
	changesFile?: string;
} = {}): string {
	const prompt: string[] = [];
	if (prTemplate) prompt.push(`PR Template file: ${prTemplate}\n`);
	prompt.push('# Opening PR Instructions:\n');
	prompt.push(
		existingPRContent
			? `Read the file ${changesFile} which contains NEW commits and changes to incorporate into an EXISTING Pull Request. Existing PR content can be read from : ${existingPRContent}`
			: `Read the file ${changesFile} which contains NEW commits and changes to create a Pull Request.`,
	);
	prompt.push(commonInstructions);

	// Minimal re-export of the original helper kept in root before refactor.
	// The original implementation lives in project root; moving it here keeps utilities together.
	return prompt.join('\n');
}
