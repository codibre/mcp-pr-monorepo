describe('SquashCommitsTool additional branches', () => {
	beforeEach(() => jest.resetModules());

	it('rejects protected branch', async () => {
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			cwdJoin: jest.fn((s: string) => s),
			getBranchSchema: () => ({ main: 'main' }),
			getErrorMessage: (e: any) => String(e),
			Infer: undefined,
			isProtectedBranch: () => true,
			McpResult: undefined,
			McpServer: undefined,
			gitService: {},
			ToolRegister: undefined,
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));

		const { SquashCommitsTool } = require('src/tools/squash-commits.tool');
		const t = new SquashCommitsTool();
		await expect(
			t.squashCommits({
				cwd: '/cwd',
				current: 'main',
				target: 'main',
				commit: 'm',
			} as any),
		).rejects.toThrow(
			/Operation not allowed: the branch 'main' is a protected branch/,
		);
	});

	it('throws when no commits found between branches', async () => {
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			cwdJoin: jest.fn((s: string) => s),
			getBranchSchema: () => ({}),
			getErrorMessage: (e: any) => String(e),
			Infer: undefined,
			isProtectedBranch: () => false,
			McpResult: undefined,
			McpServer: undefined,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(true),
				logRange: jest.fn().mockResolvedValue(''),
			},
			ToolRegister: undefined,
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));

		const { SquashCommitsTool } = require('src/tools/squash-commits.tool');
		const t = new SquashCommitsTool();
		await expect(
			t.squashCommits({
				cwd: '/cwd',
				current: 'feat',
				target: 'main',
				commit: 'm',
			} as any),
		).rejects.toThrow(/Failed to list commits/);
	});

	it('throws when working tree dirty', async () => {
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			cwdJoin: jest.fn((s: string) => s),
			getBranchSchema: () => ({}),
			getErrorMessage: (e: any) => String(e),
			Infer: undefined,
			isProtectedBranch: () => false,
			McpResult: undefined,
			McpServer: undefined,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(true),
				logRange: jest.fn().mockResolvedValue('h1\nh2'),
				push: jest.fn().mockResolvedValue(undefined),
				fetch: jest.fn().mockResolvedValue(undefined),
				statusPorcelain: jest.fn().mockResolvedValue(' M modified'),
			},
			ToolRegister: undefined,
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));

		const { SquashCommitsTool } = require('src/tools/squash-commits.tool');
		const t = new SquashCommitsTool();
		await expect(
			t.squashCommits({
				cwd: '/cwd',
				current: 'feat',
				target: 'main',
				commit: 'm',
			} as any),
		).rejects.toThrow(/Working tree is not clean/);
	});
});
