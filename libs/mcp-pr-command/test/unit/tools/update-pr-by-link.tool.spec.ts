// Mock gh client API via gh-client-instance to avoid Octokit calls
jest.mock('../../../src/internal/gh-client-instance', () => ({
	ghClient: {
		prView: jest.fn().mockResolvedValue({
			headRefName: 'feat',
			baseRefName: 'main',
			title: 't',
			body: 'b',
		}),
		prList: jest.fn().mockResolvedValue([]),
	},
}));

// tool imported dynamically in test body after mocking context
// Ensure we spy the ghClient instance that the tool imports via the internal barrel
beforeEach(() => {
	jest.resetModules();
});

describe('UpdatePRByLinkTool', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('extracts number and calls preparePr', async () => {
		const barrel = require('../../../src/internal');
		const ghClient = barrel.ghClient;
		const prViewSpy = jest.spyOn(ghClient, 'prView').mockResolvedValue({
			headRefName: 'feat',
			baseRefName: 'main',
			title: 't',
			body: 'b',
		} as any);
		const prepareMod = require('../../../src/internal/prepare-pr');
		const prepareSpy = jest
			.spyOn(prepareMod, 'preparePr')
			.mockResolvedValue({ structuredContent: { filesToRead: [] } } as any);
		const runMod = await import('src/internal/run');
		jest.spyOn(runMod, 'run').mockResolvedValue('');
		const cs = await import('src/internal');
		jest.spyOn(cs.contextService, 'cwd', 'get').mockReturnValue(process.cwd());
		jest.spyOn(cs.contextService, 'cwd', 'get').mockReturnValue(process.cwd());
		const { UpdatePRByLinkTool } = await import(
			'../../../src/tools/update-pr-by-link'
		);
		const t = new UpdatePRByLinkTool();
		const res = await t.updatePrByLinkHandler({
			cwd: process.cwd(),
			prUrl: 'https://github.com/owner/repo/pull/321',
		} as any);
		expect(prViewSpy).toHaveBeenCalledWith(321, expect.any(Array));
		expect(prepareSpy).toHaveBeenCalled();
		// returned structured content merges preparePr's structuredContent
		expect(res.structuredContent?.filesToRead).toBeDefined();
	});
});
