describe('ReplaceCommitMessagesTool error paths', () => {
	beforeEach(() => jest.resetModules());

	it('throws when filterBranch fails and cleanup occurs', async () => {
		const gitMock: any = {
			tryFetch: jest.fn().mockResolvedValue(undefined),
			refExists: jest.fn().mockResolvedValue(true),
			logRange: jest.fn().mockResolvedValue('h1\n---END---\n'),
			push: jest.fn().mockResolvedValue(undefined),
			fetch: jest.fn().mockResolvedValue(undefined),
			checkoutBranch: jest.fn().mockResolvedValue(undefined),
			reset: jest.fn().mockResolvedValue(undefined),
			showCommitBody: jest.fn().mockResolvedValue('old'),
			deleteBranch: jest.fn().mockResolvedValue(undefined),
			filterBranchMsgFilter: jest
				.fn()
				.mockRejectedValue(new Error('filter failed')),
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
				commits: ['new'],
			} as any),
		).rejects.toThrow(/Failed while rewriting commits/);
	});
});
