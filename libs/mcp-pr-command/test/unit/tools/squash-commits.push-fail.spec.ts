describe('SquashCommitsTool push failure paths', () => {
	beforeEach(() => jest.resetModules());

	it('throws when initial push before squashing fails', async () => {
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
				push: jest.fn().mockRejectedValue(new Error('push failed')),
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
		).rejects.toThrow(
			/Failed to push branch 'feat' to origin before squashing/,
		);
	});

	it('restores backup when final push fails after commit', async () => {
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
		const fs = require('fs/promises');
		jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined as any);
		jest.spyOn(fs, 'unlink').mockResolvedValue(undefined as any);

		// make the final push throw by mocking gitService.push to succeed once then fail
		const internals = require('src/internal');
		const pushSpy = jest
			.spyOn(internals.gitService, 'push')
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('final push failed'));

		const { SquashCommitsTool } = require('src/tools/squash-commits.tool');
		const t = new SquashCommitsTool();
		await expect(
			t.squashCommits({
				cwd: '/cwd',
				current: 'feat',
				target: 'main',
				commit: 'm',
			} as any),
		).rejects.toThrow(/Failed to squash commits/);
		// restoreBackup calls reset to origin head as part of its flow
		expect(resetSpy).toHaveBeenCalled();
		expect(pushSpy).toHaveBeenCalled();
	});
});
