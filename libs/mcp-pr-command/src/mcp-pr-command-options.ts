export interface BranchSchema {
	production: string;
	homologation: string;
	development: string;
}

export type ChangingBranchType = 'feat' | 'fix' | 'hotfix' | 'release';

export interface BranchMappingItem {
	origin: keyof BranchSchema;
	target: keyof BranchSchema;
}

export type BranchSchemaCallback = (cwd: string) => BranchSchema;

/**
 * Options for configuring the MCP PR Command behavior.
 */
export interface McpPRCommandOptions {
	/**
	 * Regular expression pattern used to extract card or ticket IDs from a branch name.
	 * The extracted ID(s) can be used in cartPathLinkReplacePattern to generate card links.
	 *
	 * @example
	 *   // For branch name: 'feature/PROJ-1234-add-login'
	 *   branchCardIdExtractPattern: /PROJ-\d+/g
	 */
	branchCardIdExtractPattern?: RegExp;

	/**
	 * Base URL of the card tracking website (e.g., Jira, Kanbanize) for constructing card links.
	 *
	 * @example
	 *   cardLinkWebSite: 'https://tracker.example.com'
	 */
	cardLinkWebSite?: string;

	/**
	 * Pattern to replace in the card path when generating card links.
	 * Used together with branchCardIdExtractPattern and cardLinkWebSite to build the full card URL.
	 *
	 * For example, if your branch name is 'feature/PROJ-1234-add-login',
	 *   branchCardIdExtractPattern: /PROJ-\d+/g
	 *   cardLinkWebSite: 'https://tracker.example.com'
	 *   cartPathLinkReplacePattern: '/board/123/card/{cardId}'
	 * The resulting card link would be:
	 *   'https://tracker.example.com/board/123/card/PROJ-1234'
	 */
	cartPathLinkReplacePattern?: string;

	/**
	 * Preferred language for prompts and messages (e.g., 'en', 'pt-br', 'english', 'portuguese').
	 * Can be a language code or full language name, as used in conversational contexts.
	 *
	 * @example
	 *   language: 'en'
	 *   language: 'pt-br'
	 *   language: 'english'
	 *   language: 'portuguese'
	 */
	language?: string;

	/**
	 * Default prompt to use when generating PR descriptions or commit messages.
	 * You can use the %LANGUAGE% placeholder to dynamically insert the selected language into the prompt.
	 *
	 * @example
	 *   defaultPrompt: `## GENERAL INSTRUCTIONS\n
	 * - PR must be written in %LANGUAGE%, unless specified otherwise in .github/copilot-instructions.md\n
	 * - ALWAYS respect PR template when present.\n
	 * - If current PR exists, use its content as context, but enforce PR template. Maybe current PR is not following it\n
	 * - Focus on intent and user-visible impact (what changed and why)\n
	 *
	 * ## DESCRIPTION AND TITLE INSTRUCTIONS:\n
	 * - Explain the change made based on commit messages and diff provided\n
	 * - Title must be concise, single-line summary with no special characters.\n
	 * - Context of the problem being solved must be included\n
	 *
	 * ## COMMIT FORMATTING INSTRUCTIONS:\n
	 * - Omit trivial commits (e.g. 'fix lint') EXCEPT merge commits that reference PRs with useful context\n
	 * - For commits referencing PRs (e.g. "Merge pull request #123"), ALWAYS preserve the PR reference in the summary\n
	 * - Format as bullet points with '- ' (no hashes, no extra markup)\n
	 *
	 * ## CARD LINK INSTRUCTIONS:\n
	 * - When having a PR template with a strong link placeholder, try to comply to suggested format\n
	 *   - Example of place holder: [#TASK_NUMBER](https://link.com/ctrl_board/BOARD_NUMBER/cards/TASK_NUMBER/details/). In this case, extract TASK_NUMBER from url to fill the place holder\n
	 *   - If a undocumented pattern is found, try to follow it as best as possible\n
	 * - Information from cards must be fetched from Kanbanize and included in the PR description\n
	 *   - Summarize only the relevant parts if the description is too long\n
	 *   - Respect template structure when adding card links.\n
	 *   - Card information may go just below card link.\n   * `
	 */
	defaultPrompt?:
		| string
		| {
				additional: string;
		  };

	/**
	 * Complementary description to be used by the MCP for additional context.
	 * You can use this if you want to provide extra information that fits to your
	 * enterprise usage.
	 *
	 * Example:
	 *  MCP to be used only for [company name] project, with REPO organization being [organization name].
	 **/
	complementaryMcpDescription?: string;

	/**
	 * Custom branch schema to define production, homologation, and development branches.
	 * If not provided, main will be assumed to everyone (trunk based).
	 */
	branchSchema?: BranchSchema | BranchSchemaCallback;

	/**
	 * Custom branch mapping to define origin and target branches for different branch types.
	 * If not provided, default mapping will be used.
	 */
	branchMapping?: Record<ChangingBranchType, BranchMappingItem>;
}
