# Changelog


## [0.3.2](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.3.1...mcp-pr-command@0.3.2) (2025-11-09)

### Fixes:

#### improve changelog section headers and layout

> - Added typeMap to map commit types to section titles (e.g., 'fix' to 'Fixes:')
> - Updated changelog grouping and sorting for better readability
> - Made changelog sections collapsible for improved navigation
> - Changed release-it config: push is now false, hooks commented out
> - Enhanced CHANGELOG.md with collapsible sections and clearer type titles

> This improves the clarity and usability of generated changelogs.

## [0.3.1](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.3.0...mcp-pr-command@0.3.1) (2025-11-09)

### Fixes:

<details>
<summary>improving changelog generation</summary>

> Creating collapsable sections and fixing
> type titles for better layout

</details>

## [0.3.0](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.2.1...mcp-pr-command@0.3.0) (2025-11-09)

### Features:

<details>
<summary>allow company customization, improve card link extraction, and refactor options</summary>

> - Refactor `cardLinkInferPattern` to `branchCardIdExtractPattern` throughout the codebase
> - Enable advanced customization via options and config file
> - Update and expand README with CLI and Node.js usage examples
> - Improve unit tests for language and non-language scenarios
> - Adjust messages and instructions for internationalization and clarity
> - Fix minor bugs and inconsistencies in internal utilities

</details>

## [0.2.1](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.2.0...mcp-pr-command@0.2.1) (2025-11-08)

### Fixes:

<details>
<summary>fixing docs</summary>

> Docs refered to this lib as a cli, but it's actually
> a MCP server

</details>

## [0.2.0](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.1.6...mcp-pr-command@0.2.0) (2025-11-08)

### docs

<details>
<summary>adding demonstration video</summary>

</details>

<details>
<summary>fixing vídeo link</summary>

</details>


### Features:

<details>
<summary>add PR template, global language option, keywords, and unify PR prompt logic</summary>

> - Introduce a standardized pull request template to guide contributors and improve PR clarity and review quality.
> - Enable users to define a default language for PR-related operations, enhancing internationalization and user experience.
> - Update package.json with additional keywords to boost searchability and documentation visibility. No impact on runtime or functionality.
> - Refactor PR workflow to always use buildCopilotPrompt, ensuring consistent instructions for PR titles and descriptions.

</details>

## [0.1.6](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.1.5...mcp-pr-command@0.1.6) (2025-11-08)

### Fixes:

<details>
<summary>beterring logo</summary>

> Making it transparent and better sized

</details>

## [0.1.5](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.1.4...mcp-pr-command@0.1.5) (2025-11-08)

### docs

<details>
<summary>bettering doc</summary>

</details>


### Fixes:

<details>
<summary>adding missing lib</summary>

</details>

## [0.1.4](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.1.3...mcp-pr-command@0.1.4) (2025-11-08)

### Fixes:

<details>
<summary>fixing command on unix</summary>

> Adding '#node' to command so it'll be executable on unix

</details>

## [0.1.3](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.1.2...mcp-pr-command@0.1.3) (2025-11-08)

### Fixes:

<details>
<summary>fixing logo</summary>

</details>

## [0.1.2](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.1.1...mcp-pr-command@0.1.2) (2025-11-08)

### Fixes:

<details>
<summary>fixing changelog generation</summary>

> Changelog generation wasn't correctly creating
> link references. Fixing it

</details>

## [0.1.1](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.1.0...mcp-pr-command@0.1.1) (2025-11-08)

### Fixes:

<details>
<summary>removing hardcoded link refs</summary>

</details>

## 0.1.0 (2025-11-08)

### Features:

<details>
<summary>initial commit - add CLI, core tools and project scaffold</summary>

> Initial implementation of the mcp-pr-command package and repository scaffold.

> What's included:
> - CLI entrypoint and MCP server bootstrap (stdio transport).
> - Core programmatic tools for PR workflows:
>   - detect-branches, prepare-pr, submit-pr, update-pr-by-link
>   - get-commit-messages, get-commit-contents
>   - replace-commit-messages, squash-commits, create-branch
> - Internal utilities (git helpers, context, logging, path/shell helpers).
> - TypeScript config, Jest/ts-jest test setup and a unit test for server start.
> - Package README with usage, prerequisites and VS Code MCP integration.
> - Monorepo-friendly configs (turbo/pnpm, shared jest config mappings).

> Why:
> - Provides a small, scriptable CLI and programmatic API to simplify MCP-style
>   pull-request workflows and common history editing tasks.
> - Designed to be used interactively (CLI) or integrated into editors via MCP.

> Notes:
> - Tools that rewrite history include safety measures and guidance in the README.
> - Several commands rely on git and the GitHub CLI ('gh') being present in PATH.

> This commit adds the working foundation for further feature development and
> documentation.

</details>
