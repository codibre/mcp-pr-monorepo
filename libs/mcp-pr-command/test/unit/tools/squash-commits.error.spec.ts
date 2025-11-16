jest.mock('../../../src/internal/git-service', () => ({
	gitService: {
		tryFetch: jest.fn().mockResolvedValue(undefined),
		fetch: jest.fn().mockResolvedValue(undefined),
		refExists: jest.fn().mockResolvedValue(true),
		logRange: jest.fn().mockResolvedValue('h1\nh2'),
		push: jest.fn().mockResolvedValue(undefined),
		checkoutBranch: jest.fn().mockResolvedValue(undefined),
		commit: jest.fn().mockRejectedValue(new Error('commit failed')),
		statusPorcelain: jest.fn().mockResolvedValue(''),
		revParseHead: jest.fn().mockResolvedValue('newhead'),
		branchForceUpdate: jest.fn().mockResolvedValue(undefined),
		clean: jest.fn().mockResolvedValue(undefined),
		reset: jest.fn().mockResolvedValue(undefined),
	},
}));

jest.mock('../../../src/internal/context-service', () => ({
	contextService: {
		get cwd() {
			return process.cwd();
		},
		registerTool: jest.fn(),
		wrapCallback: jest.fn((fn: any) => fn),
	},
}));

jest.mock('fs/promises', () => ({
	writeFile: jest.fn().mockResolvedValue(undefined),
	unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('SquashCommitsTool error restoration', () => {
	beforeEach(() => jest.restoreAllMocks());

	it('calls restoreBackup on commit failure', async () => {
		const cs = await import('../../../src/internal/context-service');
		jest.spyOn(cs.contextService, 'cwd', 'get').mockReturnValue(process.cwd());
		const barrel = await import('src/internal');
		jest
			.spyOn(barrel.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());

		const git = await import('../../../src/internal/git-service');
		const restoreSpy = jest.spyOn(git.gitService, 'reset');

		const mod = await import('../../../src/tools/squash-commits.tool');
		const t = new mod.SquashCommitsTool();
		await expect(
			t.squashCommits({
				cwd: process.cwd(),
				current: 'feat',
				target: 'main',
				commit: 'msg',
			} as any),
		).rejects.toThrow(/Failed to squash commits/);
		expect(restoreSpy).toHaveBeenCalled();
	});
});
