import z from 'zod';
import { execSync } from 'child_process';
import { attempt } from '../internal/attempt';
import { getErrorMessage } from '../internal/get-error-message';
import { normalizePath, ToolRegister } from 'src/internal';
import { McpServer, ToolCallback } from '../internal';

const SLICE_POSITION = 3;

const inputSchema = {
	cwd: z.string().min(1),
	current: z.string().min(1),
	target: z.string().min(1),
};
const outputSchema = {
	commits: z.array(z.string()),
	error: z.string().optional(),
};

export class GetCommitMessagesTool implements ToolRegister {
	registerTool(server: McpServer): void {
		server.registerTool(
			'get-commit-messages',
			{
				title: 'Get commit messages between branches',
				description: `Returns an array containing the full commit messages (title and body) in the difference between two branches.
Input schema:
{
  cwd: string,
  current: string,
  target: string
}
`,
				inputSchema,
				outputSchema,
			},
			this.getCommitMessages as ToolCallback<typeof inputSchema>,
		);
	}

	async getCommitMessages(params: {
		cwd: string;
		current: string;
		target: string;
	}) {
		const { current, target } = params;
		const cwd = normalizePath(params.cwd);
		if (!cwd || !current || !target) {
			return {
				content: [
					{
						type: 'text',
						text: 'Missing required parameters: cwd, current, or target',
					},
				],
			};
		}
		const baseCandidates = [`origin/${target}`, `${target}`, 'origin/HEAD'];
		const headCandidates = [`${current}`, `origin/${current}`];
		let gitOutput = '';
		let lastError: unknown = null;
		let found = false;
		function refExists(ref: string) {
			try {
				execSync(`git rev-parse --verify --quiet ${ref}`, {
					encoding: 'utf8',
					cwd,
				});
				return true;
			} catch {
				return false;
			}
		}
		const tryFind = () => {
			for (const baseRef of baseCandidates) {
				for (const headRef of headCandidates) {
					if (!refExists(baseRef) || !refExists(headRef)) continue;
					const range = `${baseRef}..${headRef}`;
					try {
						gitOutput = execSync(
							`git log ${range} --pretty=format:'%H%n%B%n---ENDCOMMIT---'`,
							{ encoding: 'utf8', cwd },
						).trim();
						found = true;
						return;
					} catch (e) {
						lastError = e;
					}
				}
			}
		};
		tryFind();
		if (!found) {
			attempt(() =>
				execSync(`git fetch origin ${target}`, { encoding: 'utf8', cwd }),
			);
			attempt(() =>
				execSync(`git fetch origin ${current}`, { encoding: 'utf8', cwd }),
			);
			attempt(() => {
				let originHead = null;
				try {
					const sym = execSync(
						'git symbolic-ref --quiet refs/remotes/origin/HEAD',
						{ encoding: 'utf8', cwd },
					).trim();
					const parts = sym.split('/');
					originHead = parts.slice(SLICE_POSITION).join('/');
				} catch {
					originHead = null;
				}
				if (originHead) {
					baseCandidates.unshift(`origin/${originHead}`);
					baseCandidates.unshift(`${originHead}`);
				}
			});
			tryFind();
		}
		if (!found) {
			const msg = lastError
				? getErrorMessage(lastError)
				: 'unknown error while running git log';
			const help = `Tried refs: bases=${baseCandidates.join(', ')} heads=${headCandidates.join(', ')}. Ensure the target branch exists locally or on origin.`;
			return {
				content: [
					{ type: 'text', text: `Failed to get git log: ${msg}. ${help}` },
				],
				structuredContent: { error: msg, commits: [] },
			};
		}
		if (!gitOutput) {
			return {
				content: [
					{ type: 'text', text: 'No commits found between the branches.' },
				],
				structuredContent: { commits: [] },
			};
		}
		const entries = gitOutput
			.split('\n---ENDCOMMIT---\n')
			.map((s) => s.trim())
			.filter(Boolean);
		const messages = entries.map((entry) => {
			const lines = entry.split('\n');
			const bodyLines = lines.slice(1);
			return bodyLines
				.join('\n')
				.replace(/---ENDCOMMIT---/g, '')
				.trim();
		});
		return {
			content: [
				{
					type: 'text',
					text: `Found ${messages.length} commit(s) between ${target} and ${current}.`,
				},
			],
			structuredContent: { commits: messages },
		};
	}
}
