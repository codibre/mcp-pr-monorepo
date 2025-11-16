describe('squash-commits pre-push failure -> restoreBackup', () => {
	beforeEach(() => jest.resetModules());

	test('restoreBackup is called when pre-push fails', async () => {
		// Arrange: mock internals barrel like other tests in this package
		const pushMock = jest.fn().mockRejectedValue(new Error('pre-push failed'));
		const resetSpy = jest.fn().mockResolvedValue(undefined);

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
				push: pushMock,
				fetch: jest.fn().mockResolvedValue(undefined),
				checkoutBranch: jest.fn().mockResolvedValue(undefined),
				reset: resetSpy,
				commit: jest.fn().mockResolvedValue(undefined),
				clean: jest.fn().mockResolvedValue(undefined),
				statusPorcelain: jest.fn().mockResolvedValue(''),
			},
			ToolRegister: undefined,
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));

		// avoid touching disk
		jest.doMock('fs/promises', () => ({
			writeFile: jest.fn().mockResolvedValue(undefined),
			unlink: jest.fn().mockResolvedValue(undefined),
		}));

		const {
			SquashCommitsTool,
		} = require('../../../src/tools/squash-commits.tool');
		const t = new SquashCommitsTool();

		// Act & Assert: push failure before squashing should throw a push-specific error
		await expect(
			t.squashCommits({
				cwd: '/cwd',
				current: 'feat',
				target: 'main',
				commit: 'm',
				push: true,
			} as any),
		).rejects.toThrow(
			/Failed to push branch 'feat' to origin before squashing/,
		);

		// restoreBackup is not attempted for pre-push failure path, so reset should not be called
		expect(resetSpy).not.toHaveBeenCalled();
	});
});
