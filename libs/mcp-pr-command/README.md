![mcp-pr-command-logo](https://cdn.jsdelivr.net/gh/codibre/mcp-pr-monorepo@main/libs/mcp-pr-command/resources/mcp-pr-command-logo.png)

# MCP PR Command

MCP stdio server to help with PR workflows: detecting branches, preparing PR content, collecting commit diffs, rewriting commit messages and submitting pull requests.

This package provides an MCP server (`mcp-pr-command`) designed to be connected through GitHub Copilot in VS Code. It offers several tools to simplify pull request creation and maintenance.

## Demonstration video

[See demonstration video here!](https://cdn.jsdelivr.net/gh/codibre/mcp-pr-monorepo@main/libs/mcp-pr-command/resources/PR%20opening.mp4)

You can check out demonstration PR [here](https://github.com/codibre/mcp-pr-monorepo/pull/2)

## What this package offers

This MCP server exposes focused tools to simplify common pull-request workflows by inspecting and operating on git history and remote PRs. Each tool is available as an MCP tool that can be invoked through GitHub Copilot.


Core tools and what they do:

### detect-branches

Inspect the current git branch and suggest a target/base branch for a PR. It computes branch proximity using git merge-base and rev-list heuristics and can infer tracker/card links from branch names. Use this as the first step in an "open PR" workflow.

### prepare-pr

Prepare PR artifacts and human-facing instructions. It gathers diffs and commit lists, detects existing PRs (via `gh`), reads PR templates (if present), and returns files to read plus step-by-step next actions and candidate card links. Intended to be run after `detect-branches` and before submitting.

### submit-pr

Create or update a pull request on the remote (uses the GitHub CLI under the hood). Ensures the branch is pushed and then either edits an existing PR or creates a new one, returning the PR URL and follow-ups.

### update-pr-by-link

Given an existing PR URL, fetch PR metadata (head/base branches, title/body) and run the same prepare flow so you can update the PR using local context.

### get-commit-messages

Return full commit messages (title + body) in the range between a base and head ref. Handles common local/origin ref combinations and will fetch missing refs if necessary.

### get-commit-contents

Generate a single file containing commit messages, a diff summary and the full unified diff between two refs. Useful to attach to reviews or to pass to other tools that need a human-readable changeset.

### replace-commit-messages

Rewrite the commit messages between two refs using a provided list of messages (ordering matters). The tool validates counts, protects special branches, creates a backup tag, and rewrites history safely using a temporary branch and git filter-branch flow.

### squash-commits

Combine the commits between a base and head into a single commit with a supplied message. The tool creates a backup tag, supports the single-commit amend case, and pushes changes with --force when appropriate.

### create-branch

Create a new feature/fix/hotfix/release branch following configurable branch schemas (from branches.ini) or sane defaults. Normalizes suffixes and checks out from the chosen base.

Notes and recommended usage:

- Typical open-PR flow: run `detect-branches` -> `prepare-pr` (inspect suggested files and the suggested body) -> `submit-pr`.
- For editing commit history, always run `get-commit-messages` first to review the changes before calling `replace-commit-messages` or `squash-commits`.
- The tools rely on standard git and the GitHub CLI (`gh`) where needed. Ensure those are available in your PATH when using `prepare-pr`, `submit-pr`, or `update-pr-by-link`.

## How to install the MCP server

### Prerequisites

#### Git

Of course, you need to have git installed and running on your system.

#### GitHub CLI (gh)

Several tools (for example `prepare-pr`, `submit-pr` and `update-pr-by-link`) rely on the GitHub CLI (`gh`) to query and create PRs. Before using those tools, please install the official GitHub CLI and make sure you're logged in to your GitHub account:

- Official site: https://cli.github.com/
- After installing, run `gh auth login` and follow the prompts to authenticate.

### Installation

Install the package globally:
```bash
npm i -g mcp-pr-command
```

After installation, you need to configure it in VS Code (see next section).

## How to configure it in VS Code for Copilot

The simplest way to register an MCP server is using the MCP extension command inside VS Code:

1. Open the Command Palette in VS Code (usually `Ctrl + Shift + P` on Windows/Linux or `Cmd + Shift + P` on macOS).
2. Search for and select **"MCP: Add Server"**.
3. Follow the steps below:
   - Choose the **"Command (stdio)"** option.
   - Provide the command according to your environment:
     - **Linux/macOS/Windows:**
       ```
       mcp-pr-command
       ```
    - **Windows (WSL + zsh):**
       ```
       wsl zsh -i -c "mcp-pr-command"
       ```
    - **Windows (WSL + bash):**
       ```
       wsl bash -i -c "mcp-pr-command"
       ```
   - Enter a name for the MCP server (suggestion: `mcp-pr-command`).
   - Enter the execution scope (suggestion: `global`).
4. Confirm and save.

> This will register the MCP server and allow Copilot to use these tools to generate PR descriptions and rewrite commits!
> Remember you can add --mcp-options or --mcp-options-file to the call so you can customize card link inferring from branch.

## Examples

### Infer card/pr links

The MCP server supports runtime inference of card and PR links by passing a JSON options object. Example:

```bash
mcp-pr-command --mcp-options '{"branchCardIdExtractPattern":"[\w\-]+/(\d+)/(\d+)", "cardLinkWebSite":"https://link.com","cartPathLinkReplacePattern":"$1/card/$2/details"}'
```

In the example above the server will use the provided regular pattern to extract card identifiers from text and map them into the `prLinkInferPattern` template.

You can also inform a config option file like this:


```bash
mcp-pr-command --mcp-options-file mcp-pr-command-options.json
```

### Node.js usage (programmatic)

You can also use this library directly from Node.js, which is ideal for organizations that want to set up their own CLI wrapper or enforce specific options programmatically. This allows you to start the MCP PR Command server with custom options, without relying on CLI arguments or config files.

```js
// my-mcp-server.js
#!/usr/bin/env node
const { startServer } = require('mcp-pr-command');

startServer({
   cardLinkWebSite: 'https://link.com',
   cartPathLinkReplacePattern: '$1/card/$2/details',
   branchCardIdExtractPattern: '[\\w\\-]+/(\\d+)/(\\d+)',
   complementaryMcpDescription: 'Custom org PR workflow',
   // ...any other options from McpPRCommandOptions
});
```

You can then run your server with:

```bash
node my-mcp-server.js
```

This approach is recommended for organizations with well-established parameters or custom workflows. You can fully control the server's configuration in code, integrate with other systems, or wrap it in your own CLI.
