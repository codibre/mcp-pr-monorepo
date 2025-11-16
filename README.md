[![Maintainability](https://qlty.sh/gh/codibre/projects/mcp-pr-monorepo/maintainability.svg)](https://qlty.sh/gh/codibre/projects/mcp-pr-monorepo)

# mcp-pr-monorepo

This repository is a small monorepo that contains tools and utilities for working with MCP PR workflows and related CLI tools. It follows a modern JavaScript/TypeScript monorepo layout and uses pnpm + Turbo for workspace management and fast builds.

## Overview

This monorepo is intended to host one or more packages that implement command-line tools and helpers used to create, prepare and submit pull requests (PRs) following the MCP workflow. The goal is to keep related utilities together, share configuration, and make development, testing and publishing consistent across packages.

Key principles:
- Small, focused packages under `libs/`
- Shared tooling and configuration at the repository root
- Automated CI for tests, linting and publishing

## Packages

Top-level packages live under the `libs/` directory. At the moment this repository contains:

- `libs/mcp-pr-command` — the primary CLI and set of tools for MCP PR operations (detect branches, prepare PRs, replace commits, squash commits, submit PRs, etc.).

Each package should include its own `package.json`, `src/`, `test/` and a short README describing package-specific usage and API.

## Monorepo tooling

This project uses a modern toolchain to speed up development:

- Package manager: pnpm (workspace-aware)
- Build system: Turbo (turbo.json)
- Testing: Jest
- Linting: ESLint (+ optional Prettier)
- Commit validation: commitlint
- CI: GitHub Actions (recommended)

You can find shared configuration files in the repository root. Individual packages may extend or override these configs.

## Getting started

Prerequisites:

- Node.js (current LTS or >= 18 recommended)
- pnpm >= 6 (this repo uses pnpm workspace features)
- Git

Quick setup:

```bash
# clone
git clone https://github.com/codibre/mcp-pr-command.git
cd mcp-pr-command

# install dependencies
pnpm install
```

Run tests for all packages:

```bash
pnpm test
```

Build all packages:

```bash
pnpm build
```

Lint everything:

```bash
pnpm lint
pnpm lint:fix   # auto-fix common issues
```

If you want to work only on the `mcp-pr-command` package, use pnpm filters to scope commands:

```bash
pnpm --filter mcp-pr-command install
pnpm --filter mcp-pr-command test
pnpm --filter mcp-pr-command build
```

## Development workflow and tips

- Keep changes focused per PR: prefer small, reviewable commits.
- Use conventional commits to allow automated changelog/versioning tools to work well (feat/fix/docs/test/chore/etc.).
- Don’t worry about formatting while coding — run `pnpm lint:fix` before committing or rely on pre-commit hooks.
- Add tests for new features and bug fixes. Follow Arrange/Act/Assert pattern in tests.

### Running a single package locally

From the repository root you can run package-specific scripts. Example:

```bash
pnpm --filter mcp-pr-command dev
```

(Check the `libs/mcp-pr-command/package.json` for available scripts.)

## Contributing

We welcome contributions. Here's a short guide to get your changes accepted quickly.

1. Fork the repository.
2. Create a descriptive branch (use a type prefix):

```bash
git checkout -b feat/your-feature-name
```

3. Install dependencies and run the test suite:

```bash
pnpm install
pnpm test
```

4. Make changes, add tests and documentation. Keep commits small and meaningful.

5. Lint and format:

```bash
pnpm lint
pnpm lint:fix
```

6. Commit using Conventional Commits format, e.g.:

```bash
git add .
git commit -m "feat(mcp): add detect-branches tool"
```

7. Push your branch and open a Pull Request. In the PR description include:
- what the change does
- why it's needed
- any migration or breaking-change notes
- links to related issues (if applicable)

### Pull request checklist

- [ ] Tests pass locally
- [ ] New functionality has tests
- [ ] Code is linted and formatted
- [ ] Documentation/README updated if applicable
- [ ] Commits follow conventional commit format

## Package publishing and CI

The repository is set up for automated CI and publishing. Typical CI jobs should run:

1. Install deps
2. Build packages (turbo)
3. Run tests
4. Lint
5. Publish changed packages (when merging to main)

Publishing in this repo is automated when semantic commits determine a version bump; ensure commit messages correctly reflect the change type.

## Where to look next

- Package source: `libs/mcp-pr-command/src`
- Package tests: `libs/mcp-pr-command/test`
- Package tools: `libs/mcp-pr-command/src/internal` and `libs/mcp-pr-command/src/tools`
- Configuration: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `commitlint.config.js`

## License

This repository uses the MIT license — see the `LICENSE` file for full text.

## Questions or support

Open issues on GitHub or contact the maintainers via repository discussions.

---

Built with care for fast, consistent tooling and collaborative development.

