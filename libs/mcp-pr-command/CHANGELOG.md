# Changelog

## [0.6.3](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.6.2...mcp-pr-command@0.6.3) (2025-11-16)
### Fixes:

<details>
<summary>**submit-pr:** use gitService.push to push current branch</summary>


> Replace direct run-based git push calls in `submit-pr` with `gitService.push`. This centralizes push logic, improves testability (avoids shelling out during unit tests), and provides consistent error handling/reporting for push failures.



[View commit `e5dd7f6`](https://github.com/codibre/mcp-pr-monorepo/commit/e5dd7f6)


</details>

### test

<details>
<summary>**mcp-pr-command:** add unit tests to improve coverage for gh-client-api, git-service and tools</summary>


> Add and expand Jest unit tests across `libs/mcp-pr-command`:
> - Cover `gh-client-api` fallback paths, PR view/edit/create parsing and search fallbacks.
> - Exercise `git-service` utilities, fallback behaviors, and edge cases.
> - Add tests for tools (`squash-commits`, `replace-commit-messages`, `submit-pr`, `prepare-pr`, `get-commit-*`) including error paths and push/fetch scenarios.

> Tests mock `run`, `@octokit/rest`, `fs`, and temp-file helpers to be hermetic; this increases coverage and reduces regression risk.



[View commit `67e6174`](https://github.com/codibre/mcp-pr-monorepo/commit/67e6174)


</details>

## [0.6.2](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.6.1...mcp-pr-command@0.6.2) (2025-11-16)
### Fixes:

<details>
<summary>fixing vulnerabilities</summary>


> Updating libs and fixing high vulnerabilities



[View commit `273bec8`](https://github.com/codibre/mcp-pr-monorepo/commit/273bec8)


</details>

## [0.6.1](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.6.0...mcp-pr-command@0.6.1) (2025-11-16)
### Fixes:

<details>
<summary>improving coverage and memory usage</summary>


> Improving change files writing for better
> memory consumption and also increasing
> unit test coverage



[View commit `9f11599`](https://github.com/codibre/mcp-pr-monorepo/commit/9f11599)


</details>

## [0.6.0](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.5.0...mcp-pr-command@0.6.0) (2025-11-16)
### Features:

<details>
<summary>**mcp-pr-command:** use GitHub API for PR creation/update and centralize run/git utilities</summary>


> - Implement `gh-client-api` using `@octokit/rest` and `gh-client-instance` to select between CLI/API.
> - Centralize command execution in `run` and encapsulate Git operations in `git-service`.
> - Introduce `ContextService` (AsyncLocalStorage) to propagate `cwd` to MCP tools.
> - Migrate internal tools (prepare-pr, detect-branches, get-commit-*) to the new abstractions and normalize WSL/path handling.
> - Update tests and bump `libs/mcp-pr-command` to `0.5.0`.

> Rationale: enable PR creation/update via the GitHub REST API (octokit), reduce reliance on the `gh` CLI, and make PR operations independent of working-tree state.



[View commit `0c88c49`](https://github.com/codibre/mcp-pr-monorepo/commit/0c88c49)


</details>

### Fixes:

<details>
<summary>**git:** centralize refExists and tidy prepare-pr fetch handling; throw clear errors</summary>



[View commit `1097a82`](https://github.com/codibre/mcp-pr-monorepo/commit/1097a82)


</details>

## [0.5.0](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.4.0...mcp-pr-command@0.5.0) (2025-11-13)
### chore

<details>
<summary>fixing changelog [skip ci]</summary>



[View commit `42d3f54`](https://github.com/codibre/mcp-pr-monorepo/commit/42d3f54)


</details>

### Features:

<details>
<summary>**mcp-pr:** make submit-pr independent from working tree and current branch</summary>


> - Use refspec push syntax to push a branch without checking out
> - Skip push if the branch is remote-only
> - Export branch helpers (branchExists, branchExistsLocally) from git-utils and reuse them
> - Resolve arbitrary branch refs when generating diffs/commits
> - Improve push error message with actionable steps for the user

> Tests: ran unit tests for `mcp-pr-command` and they passed.



[View commit `ed348a5`](https://github.com/codibre/mcp-pr-monorepo/commit/ed348a5)


</details>

### Fixes:

<details>
<summary>**wsl:** normalize paths between Windows and WSL for MCP tools</summary>


> - Add src/internal/path-utils.ts: detect WSL and convert windows<->wsl paths
> - Normalize incoming 'cwd' in all tools to environment-appropriate format
> - Export normalizePath from internal index
> - Add unit tests for path-utils and integrate into test suite
> - Ensure build, lint, and tests pass



[View commit `798bcb4`](https://github.com/codibre/mcp-pr-monorepo/commit/798bcb4)


</details>

## [0.4.0](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.3.3...mcp-pr-command@0.4.0) (2025-11-09)
### Features:

<details>
<summary>add branch schema and mapping options for flexible branch workflows</summary>


> - Adds `branchSchema` and `branchMapping` options to define main branch names and mapping for branch types
> - Removes support for the `branches.ini` file, centralizing configuration via options/typescript
> - Refactors utilities to use the new configuration model
> - Updates documentation and examples
> - Removes obsolete files/functions (`path-utils.ts`, `shell-utils.ts`)
> - Adds and updates unit tests to cover new flows
> - Enables easy customization of branch workflows for different strategies (trunk-based, git flow, etc)
> - Maintains backward compatibility for users who do not customize options



[View commit `3b7eb6b`](https://github.com/codibre/mcp-pr-monorepo/commit/3b7eb6b)


</details>

## [0.3.3](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.3.2...mcp-pr-command@0.3.3) (2025-11-09)
### Fixes:

<details>
<summary>right commit.hbs usage</summary>


> .releaase-it.base.js wasn't reading commit.hbs from
> the correct folder. Fixed it.



[View commit `4ed053a`](https://github.com/codibre/mcp-pr-monorepo/commit/4ed053a)


</details>

## [0.3.2](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.3.1...mcp-pr-command@0.3.2) (2025-11-09)

### Fixes:

<details>
<summary>improve changelog section headers and layout</summary>

> - Added typeMap to map commit types to section titles (e.g., 'fix' to 'Fixes:')
> - Updated changelog grouping and sorting for better readability
> - Made changelog sections collapsible for improved navigation
> - Changed release-it config: push is now false, hooks commented out
> - Enhanced CHANGELOG.md with collapsible sections and clearer type titles

> This improves the clarity and usability of generated changelogs.
</details>

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
