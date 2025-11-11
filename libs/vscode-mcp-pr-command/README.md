![mcp-pr-command-logo](https://cdn.jsdelivr.net/gh/codibre/mcp-pr-monorepo@main/libs/mcp-pr-command/resources/mcp-pr-command-logo.png)

# VS Code MCP PR Command

This extension automatically starts the `mcp-pr-command` MCP server when VS Code starts (by default).

Configuration

Configure the extension settings using the standard VS Code settings UI or `settings.json`.

- `mcpPrCommand.autoStart` — boolean, default true. If false the MCP server will not be started automatically.
- `mcpPrCommand.cardLinkWebSite` — base website used to generate card links.
- `mcpPrCommand.cartPathLinkReplacePattern` — pattern used to build card paths.
- `mcpPrCommand.branchCardIdExtractPattern` — regex used to extract card ids from branch names.
- `mcpPrCommand.complementaryMcpDescription` — optional description appended to the MCP intro.

![mcp-pr-command-logo](https://cdn.jsdelivr.net/gh/codibre/mcp-pr-monorepo@main/libs/mcp-pr-command/resources/mcp-pr-command-logo.png)

# mcp-pr-command — MCP tools for Pull Request workflows

This document describes the `mcp-pr-command` tool (the MCP server and its tools). The toolset is designed to help with common PR workflows by inspecting git history, preparing PR content, collecting diffs, and performing safe history rewrites. It was designed to be used interactively (CLI) and programmatically (Node API), and to be integrated with VS Code Copilot via MCP (stdio).

## Core functionality (tools)

Each tool is exposed as an MCP subcommand/tool and addresses a single, focused task in the PR workflow. The most relevant tools are:

- detect-branches
	- Inspect the current git branch and suggest a base/target branch for a PR.
	- Uses `git merge-base` and commit distance heuristics to find the most likely target branch.
	- Can infer tracker/card identifiers from branch names using configurable regex patterns.

- prepare-pr
	- Gather PR artifacts and human-facing instructions: affected files, commit list, diffs, and candidate PR body suggestions.
	- Reads repository PR templates if present and proposes next steps and candidate reviewers or changelog lines.
	- Detects existing remote PRs via the GitHub CLI (`gh`) and includes a summary.

- submit-pr
	- Create or update a pull request on the remote using `gh` under the hood.
	- Ensures the branch is pushed, sets title/body, and returns the PR URL and follow-up steps.

- update-pr-by-link
	- Given an existing PR URL, fetch PR metadata and prepare or update the PR content using local context.

- get-commit-messages
	- Return the full commit messages (title + body) between two refs.

- get-commit-contents
	- Produce a single file containing commit messages, a diff summary, and the full unified diff between two refs.

- replace-commit-messages
	- Rewrite commit messages between two refs using a provided list of messages.
	- Validates counts, protects special branches, and performs a safe rewrite with backup tags and temporary branches.

- squash-commits
	- Squash commits between a base and head into a single commit with a supplied message.
	- Handles edge cases like single-commit amend and creates backups before rewriting history.

- create-branch
	- Create new branches following configurable schemas (feature/fix/hotfix/release) with normalized suffixes.

## Recommended workflows

- Open PR (recommended flow)
	1. `detect-branches` — choose target branch.
	2. `prepare-pr` — inspect suggested files, generated body and next steps.
	3. `submit-pr` — create or update the remote PR.

- Edit commit history safely
	1. `get-commit-messages` — inspect messages to be rewritten.
	2. `replace-commit-messages` or `squash-commits` — perform the rewrite.
	3. Follow the tool output, which creates backup tags and temporary branches.

## Prerequisites

- `git` — required for most tools.
- `gh` (GitHub CLI) — required for `prepare-pr`, `submit-pr`, and `update-pr-by-link` to inspect/create PRs remotely. Install from https://cli.github.com/ and run `gh auth login`.
