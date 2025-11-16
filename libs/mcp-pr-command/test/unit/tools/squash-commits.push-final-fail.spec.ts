describe('squash-commits final push failure -> restoreBackup', () => {
	beforeEach(() => jest.resetModules());

	test('restoreBackup is called when final push fails', async () => {
		// Arrange: reuse the project's barrel mock style
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
				push: jest.fn().mockResolvedValue(undefined),
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

		// mock fs write/unlink used for commit message file
		jest.doMock('fs/promises', () => ({
			writeFile: jest.fn().mockResolvedValue(undefined),
			unlink: jest.fn().mockResolvedValue(undefined),
		}));

		// make final push throw by mocking internals.push to succeed then fail
		const internals = require('src/internal');
		const pushSpy = jest
			.spyOn(internals.gitService, 'push')
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('final push failed'));

		const {
			SquashCommitsTool,
		} = require('../../../src/tools/squash-commits.tool');
		const t = new SquashCommitsTool();

		await expect(
			t.squashCommits({
				cwd: '/cwd',
				current: 'feat',
				target: 'main',
				commit: 'm',
				push: true,
			} as any),
		).rejects.toThrow(/Failed to squash commits/);

		expect(resetSpy).toHaveBeenCalled();
		expect(pushSpy).toHaveBeenCalled();
	});
});
