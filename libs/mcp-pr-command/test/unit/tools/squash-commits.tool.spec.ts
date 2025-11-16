// Mock gitService module before importing the tool so the tool gets the mocked
// functions during module initialization.
jest.mock('../../../src/internal/git-service', () => ({
	gitService: {
		tryFetch: jest.fn().mockResolvedValue(undefined),
		fetch: jest.fn().mockResolvedValue(undefined),
		refExists: jest.fn().mockResolvedValue(true),
		logRange: jest.fn().mockResolvedValue('hash1'),
		push: jest.fn().mockResolvedValue(undefined),
		checkoutBranch: jest.fn().mockResolvedValue(undefined),
		commit: jest.fn().mockResolvedValue(undefined),
		statusPorcelain: jest.fn().mockResolvedValue(''),
		revParseHead: jest.fn().mockResolvedValue('newhead'),
		branchForceUpdate: jest.fn().mockResolvedValue(undefined),
		clean: jest.fn().mockResolvedValue(undefined),
		reset: jest.fn().mockResolvedValue(undefined),
	},
}));

// Mock context-service to expose a stable cwd before importing the tool
jest.mock('../../../src/internal/context-service', () => ({
	contextService: {
		get cwd() {
			return process.cwd();
		},
		registerTool: jest.fn(),
		wrapCallback: jest.fn((fn: any) => fn),
	},
}));

// Avoid touching disk: mock fs/promises used to write commit message files
jest.mock('fs/promises', () => ({
	writeFile: jest.fn().mockResolvedValue(undefined),
	unlink: jest.fn().mockResolvedValue(undefined),
}));

// Import tool after mocks so module initialization uses mocked contextService
const { SquashCommitsTool } = require('../../../src/tools/squash-commits.tool');

describe('SquashCommitsTool', () => {
	beforeEach(() => jest.restoreAllMocks());

	it('single-commit flow commits and pushes', async () => {
		// ensure cwd is available for temp file creation
		const cs = await import('../../../src/internal/context-service');
		jest.spyOn(cs.contextService, 'cwd', 'get').mockReturnValue(process.cwd());
		const barrel = await import('src/internal');
		jest
			.spyOn(barrel.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		// avoid calling run which reads contextService.cwd inside run()
		const runMod = await import('src/internal/run');
		jest.spyOn(runMod, 'run').mockResolvedValue('');

		// avoid touching disk: mock fs write/unlink used for commit message files
		const fsPromises = await import('fs/promises');
		jest.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined as any);
		jest.spyOn(fsPromises, 'unlink').mockResolvedValue(undefined as any);

		const t = new SquashCommitsTool();
		const res = await t.squashCommits({
			cwd: process.cwd(),
			current: 'feat',
			target: 'main',
			commit: 'New Msg',
		} as any);
		expect(res.structuredContent?.squashed).toBe(true);
	});

	it('multi-commit flow resets and commits combined commit', async () => {
		// ensure cwd is available for temp file creation
		const cs = await import('../../../src/internal/context-service');
		jest.spyOn(cs.contextService, 'cwd', 'get').mockReturnValue(process.cwd());
		const barrel = await import('src/internal');
		jest
			.spyOn(barrel.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		// mock run to avoid external calls
		const runMod = await import('src/internal/run');
		jest.spyOn(runMod, 'run').mockResolvedValue('');
		// make logRange return two hashes
		const git = await import('../../../src/internal/git-service');
		jest.spyOn(git.gitService, 'logRange').mockResolvedValue('h1\nh2');
		const fsPromises = await import('fs/promises');
		jest.spyOn(fsPromises, 'writeFile').mockResolvedValue(undefined as any);
		jest.spyOn(fsPromises, 'unlink').mockResolvedValue(undefined as any);

		const t = new (
			await import('../../../src/tools/squash-commits.tool')
		).SquashCommitsTool();
		const res = await t.squashCommits({
			cwd: process.cwd(),
			current: 'feat',
			target: 'main',
			commit: 'Combined message',
		} as any);
		expect(res.structuredContent?.squashed).toBe(true);
		expect(res.structuredContent?.commitCount).toBeGreaterThanOrEqual(2);
	});
});
