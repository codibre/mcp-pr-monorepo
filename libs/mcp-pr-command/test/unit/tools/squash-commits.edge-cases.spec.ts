describe('SquashCommitsTool edge cases', () => {
	beforeEach(() => jest.resetModules());

	test('registerTool calls contextService.registerTool', async () => {
		const registerSpy = jest.fn();
		jest.doMock('src/internal', () => ({
			contextService: { registerTool: registerSpy },
		}));
		const {
			SquashCommitsTool,
		} = require('../../../src/tools/squash-commits.tool');
		const t = new SquashCommitsTool();
		t.registerTool({} as any);
		expect(registerSpy).toHaveBeenCalled();
	});

	test('throws when missing parameters', async () => {
		jest.doMock('src/internal', () => ({ isProtectedBranch: () => false }));
		const {
			SquashCommitsTool,
		} = require('../../../src/tools/squash-commits.tool');
		const t = new SquashCommitsTool();
		await expect(t.squashCommits({} as any)).rejects.toThrow(
			/Faltando parâmetros obrigatórios/,
		);
	});

	test('throws when base or head ref missing', async () => {
		jest.doMock('src/internal', () => ({
			isProtectedBranch: () => false,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(false),
			},
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));
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
			} as any),
		).rejects.toThrow(/Base or head reference does not exist/);
	});

	test('logRange returns only newline -> treated as no commits', async () => {
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			getErrorMessage: (e: any) => String(e),
			isProtectedBranch: () => false,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(true),
				logRange: jest.fn().mockResolvedValue('\n'),
				push: jest.fn().mockResolvedValue(undefined),
				fetch: jest.fn().mockResolvedValue(undefined),
			},
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));
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
			} as any),
		).rejects.toThrow(/No commits found between branches/);
	});
});
