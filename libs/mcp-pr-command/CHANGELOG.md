# Changelog

## [0.1.1](https://github.com/codibre/mcp-pr-monorepo/compare/mcp-pr-command@0.1.0...mcp-pr-command@0.1.1) (2025-11-08)

### fix

#### removing hardcoded link refs

## 0.1.0 (2025-11-08)

### Features:

#### initial commit - add CLI, core tools and project scaffold

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
