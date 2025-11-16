describe('ReplaceCommitMessagesTool update/push failures', () => {
	beforeEach(() => jest.resetModules());

	it('throws when initial push to origin fails before rewriting', async () => {
		const gitMock: any = {
			tryFetch: jest.fn().mockResolvedValue(undefined),
			refExists: jest.fn().mockResolvedValue(true),
			logRange: jest.fn().mockResolvedValue('h1\n---END---\n'),
			push: jest.fn().mockRejectedValue(new Error('push failed')),
		};
		jest.doMock('src/internal', () => ({
			buildTextResult: jest.fn(),
			getBranchSchema: () => ({}),
			Infer: undefined,
			isProtectedBranch: () => false,
			McpResult: undefined,
			ToolRegister: undefined,
			attempt: jest.fn(async (fn: any) => await fn()),
			McpServer: undefined,
			contextService: {},
			getErrorMessage: (e: any) => String(e),
			gitService: gitMock,
			createSystemTempFile: jest.fn().mockResolvedValue('/tmp/x'),
		}));

		const {
			ReplaceCommitMessagesTool,
		} = require('src/tools/replace-commit-messages.tool');
		const t = new ReplaceCommitMessagesTool();
		await expect(
			t.replaceCommitMessages({
				cwd: '/cwd',
				current: 'feat',
				target: 'main',
				commits: ['m1'],
			} as any),
		).rejects.toThrow(
			/Failed to push branch 'feat' to origin before rewriting/,
		);
	});

	it('throws when final update (branchForceUpdate or push) fails', async () => {
		const gitMock: any = {
			tryFetch: jest.fn().mockResolvedValue(undefined),
			refExists: jest.fn().mockResolvedValue(true),
			logRange: jest.fn().mockResolvedValue('h1\n---END---\n'),
			push: jest.fn().mockResolvedValue(undefined),
			fetch: jest.fn().mockResolvedValue(undefined),
			checkoutBranch: jest.fn().mockResolvedValue(undefined),
			showCommitBody: jest.fn().mockResolvedValue('old'),
			filterBranchMsgFilter: jest.fn().mockResolvedValue(undefined),
			revParseHead: jest.fn().mockResolvedValue('newhead'),
			branchForceUpdate: jest
				.fn()
				.mockRejectedValue(new Error('branchForce failed')),
			deleteBranch: jest.fn().mockResolvedValue(undefined),
		};
		const createTemp = jest.fn().mockResolvedValue('/tmp/x');
		jest.doMock('src/internal', () => ({
			buildTextResult: jest.fn(),
			getBranchSchema: () => ({}),
			Infer: undefined,
			isProtectedBranch: () => false,
			McpResult: undefined,
			ToolRegister: undefined,
			attempt: jest.fn(async (fn: any) => await fn()),
			McpServer: undefined,
			contextService: {},
			getErrorMessage: (e: any) => String(e),
			gitService: gitMock,
			createSystemTempFile: createTemp,
		}));

		// mock fs chmod/unlink/rm used in cleanup
		const fs = require('fs/promises');
		jest.spyOn(fs, 'chmod').mockResolvedValue(undefined as any);
		jest.spyOn(fs, 'unlink').mockResolvedValue(undefined as any);
		jest.spyOn(fs, 'rm').mockResolvedValue(undefined as any);

		const {
			ReplaceCommitMessagesTool,
		} = require('src/tools/replace-commit-messages.tool');
		const t = new ReplaceCommitMessagesTool();
		await expect(
			t.replaceCommitMessages({
				cwd: '/cwd',
				current: 'feat',
				target: 'main',
				commits: ['new'],
			} as any),
		).rejects.toThrow(/Failed to update branch or push changes/);
	});
});
