describe('SquashCommitsTool additional branches', () => {
	beforeEach(() => jest.resetModules());

	test('throws when current branch is protected', async () => {
		jest.doMock('src/internal', () => ({
			isProtectedBranch: () => true,
			getBranchSchema: () => ({ main: 'main' }),
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));

		const {
			SquashCommitsTool,
		} = require('../../../src/tools/squash-commits.tool');
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

	test('throws when git logRange throws (failed to list commits)', async () => {
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			cwdJoin: jest.fn((s: string) => s),
			getErrorMessage: (e: any) => String(e),
			isProtectedBranch: () => false,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(true),
				logRange: jest.fn().mockRejectedValue(new Error('boom')),
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
		).rejects.toThrow(/Failed to list commits/);
	});

	test('throws when no commits found between branches', async () => {
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			cwdJoin: jest.fn((s: string) => s),
			getErrorMessage: (e: any) => String(e),
			isProtectedBranch: () => false,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(true),
				logRange: jest.fn().mockResolvedValue(''),
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
		).rejects.toThrow(/Failed to list commits/);
	});

	test('throws when working tree is dirty', async () => {
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			cwdJoin: jest.fn((s: string) => s),
			getErrorMessage: (e: any) => String(e),
			isProtectedBranch: () => false,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(true),
				logRange: jest.fn().mockResolvedValue('h1\nh2'),
				push: jest.fn().mockResolvedValue(undefined),
				fetch: jest.fn().mockResolvedValue(undefined),
				statusPorcelain: jest.fn().mockResolvedValue(' M file'),
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
		).rejects.toThrow(/Working tree is not clean/);
	});

	test('single-commit path: commit failure triggers restoreBackup (reset called)', async () => {
		const resetSpy = jest.fn().mockResolvedValue(undefined);
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			cwdJoin: jest.fn((s: string) => s),
			getErrorMessage: (e: any) => String(e),
			isProtectedBranch: () => false,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(true),
				logRange: jest.fn().mockResolvedValue('h1'),
				push: jest.fn().mockResolvedValue(undefined),
				fetch: jest.fn().mockResolvedValue(undefined),
				checkoutBranch: jest.fn().mockResolvedValue(undefined),
				commit: jest.fn().mockRejectedValue(new Error('commit failed')),
				reset: resetSpy,
				clean: jest.fn().mockResolvedValue(undefined),
				statusPorcelain: jest.fn().mockResolvedValue(''),
			},
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));

		jest.doMock('fs/promises', () => ({
			writeFile: jest.fn().mockResolvedValue(undefined),
			unlink: jest.fn().mockResolvedValue(undefined),
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
				push: true,
			} as any),
		).rejects.toThrow(/Failed to update commit message/);

		expect(resetSpy).toHaveBeenCalled();
	});

	test('restoreBackup failure throws descriptive error', async () => {
		// cause commit to fail, and make restore reset throw
		jest.doMock('src/internal', () => ({
			attempt: jest.fn(async (fn: any) => await fn()),
			cwdJoin: jest.fn((s: string) => s),
			getErrorMessage: (e: any) => String(e),
			isProtectedBranch: () => false,
			gitService: {
				tryFetch: jest.fn().mockResolvedValue(undefined),
				refExists: jest.fn().mockResolvedValue(true),
				logRange: jest.fn().mockResolvedValue('h1'),
				push: jest.fn().mockResolvedValue(undefined),
				fetch: jest.fn().mockResolvedValue(undefined),
				checkoutBranch: jest.fn().mockResolvedValue(undefined),
				commit: jest.fn().mockRejectedValue(new Error('commit failed')),
				reset: jest.fn().mockRejectedValue(new Error('reset failed')),
				clean: jest.fn().mockResolvedValue(undefined),
				statusPorcelain: jest.fn().mockResolvedValue(''),
			},
			contextService: { registerTool: jest.fn(), cwd: process.cwd() },
		}));

		jest.doMock('fs/promises', () => ({
			writeFile: jest.fn().mockResolvedValue(undefined),
			unlink: jest.fn().mockResolvedValue(undefined),
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
				push: true,
			} as any),
		).rejects.toThrow(
			/Failed to restore local branch 'feat' from origin\/feat/,
		);
	});
});
