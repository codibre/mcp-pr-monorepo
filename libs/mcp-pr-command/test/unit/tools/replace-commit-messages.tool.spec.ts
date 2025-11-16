describe('ReplaceCommitMessagesTool', () => {
	beforeEach(() => jest.resetModules());

	it('throws when required params missing', async () => {
		jest.doMock('src/internal', () => ({
			buildTextResult: jest.fn(),
			getBranchSchema: jest.fn(),
			Infer: undefined,
			isProtectedBranch: jest.fn(),
			McpResult: undefined,
			ToolRegister: undefined,
			attempt: jest.fn(async (fn: any) => await fn()),
			McpServer: undefined,
			contextService: {},
			getErrorMessage: (e: any) => String(e),
			gitService: {},
			createSystemTempFile: jest.fn(),
		}));

		const {
			ReplaceCommitMessagesTool,
		} = require('src/tools/replace-commit-messages.tool');
		const inst = new ReplaceCommitMessagesTool();
		await expect(
			inst.replaceCommitMessages({
				current: '',
				target: '',
				commits: [],
			} as any),
		).rejects.toThrow(/Missing required parameters/);
	});

	it('throws on protected branch', async () => {
		jest.doMock('src/internal', () => ({
			buildTextResult: jest.fn(),
			getBranchSchema: () => ({ main: 'main', develop: 'develop' }),
			Infer: undefined,
			isProtectedBranch: () => true,
			McpResult: undefined,
			ToolRegister: undefined,
			attempt: jest.fn(async (fn: any) => await fn()),
			McpServer: undefined,
			contextService: {},
			getErrorMessage: (e: any) => String(e),
			gitService: {},
			createSystemTempFile: jest.fn(),
		}));

		const {
			ReplaceCommitMessagesTool,
		} = require('src/tools/replace-commit-messages.tool');
		const inst = new ReplaceCommitMessagesTool();
		await expect(
			inst.replaceCommitMessages({
				cwd: '/cwd',
				current: 'main',
				target: 't',
				commits: ['a'],
			} as any),
		).rejects.toThrow(
			/Operation not allowed: branch 'main' is a protected schema branch/,
		);
	});

	it('throws when branches do not exist', async () => {
		const gitMock = {
			tryFetch: jest.fn().mockResolvedValue(undefined),
			refExists: jest.fn().mockResolvedValue(false),
		} as any;
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
			createSystemTempFile: jest.fn(),
		}));

		const {
			ReplaceCommitMessagesTool,
		} = require('src/tools/replace-commit-messages.tool');
		const inst = new ReplaceCommitMessagesTool();
		await expect(
			inst.replaceCommitMessages({
				cwd: '/cwd',
				current: 'feature',
				target: 'main',
				commits: ['a'],
			} as any),
		).rejects.toThrow(/One or both of the specified branches do not exist/);
	});

	it('throws when no commits found between branches', async () => {
		const gitMock = {
			tryFetch: jest.fn().mockResolvedValue(undefined),
			refExists: jest.fn().mockResolvedValue(true),
			logRange: jest.fn().mockResolvedValue(''),
		} as any;
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
			createSystemTempFile: jest.fn(),
		}));

		const {
			ReplaceCommitMessagesTool,
		} = require('src/tools/replace-commit-messages.tool');
		const inst = new ReplaceCommitMessagesTool();
		await expect(
			inst.replaceCommitMessages({
				cwd: '/cwd',
				current: 'feature',
				target: 'main',
				commits: ['a'],
			} as any),
		).rejects.toThrow(/Failed to list commits/);
	});

	it('throws on commit count mismatch', async () => {
		const gitMock = {
			tryFetch: jest.fn().mockResolvedValue(undefined),
			refExists: jest.fn().mockResolvedValue(true),
			logRange: jest
				.fn()
				.mockResolvedValue('hash1\n---END---\nhash2\n---END---\n'),
		} as any;
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
			createSystemTempFile: jest.fn(),
		}));

		const {
			ReplaceCommitMessagesTool,
		} = require('src/tools/replace-commit-messages.tool');
		const inst = new ReplaceCommitMessagesTool();
		await expect(
			inst.replaceCommitMessages({
				cwd: '/cwd',
				current: 'feature',
				target: 'main',
				commits: ['only-one'],
			} as any),
		).rejects.toThrow(/Commit count mismatch/);
	});

	it('returns replaced:0 when no messages differ', async () => {
		const gitMock = {
			tryFetch: jest.fn().mockResolvedValue(undefined),
			refExists: jest.fn().mockResolvedValue(true),
			logRange: jest.fn().mockResolvedValue('h1\n---END---\nh2\n---END---\n'),
			push: jest.fn().mockResolvedValue(undefined),
			fetch: jest.fn().mockResolvedValue(undefined),
			checkoutBranch: jest.fn().mockResolvedValue(undefined),
			showCommitBody: jest.fn().mockResolvedValue('same message'),
			deleteBranch: jest.fn().mockResolvedValue(undefined),
		} as any;
		const buildTextResult = jest.fn((msg: string, data: any) => ({
			msg,
			data,
		}));
		jest.doMock('src/internal', () => ({
			buildTextResult,
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
			createSystemTempFile: jest.fn(),
		}));

		const {
			ReplaceCommitMessagesTool,
		} = require('src/tools/replace-commit-messages.tool');
		const inst = new ReplaceCommitMessagesTool();
		const res = await inst.replaceCommitMessages({
			cwd: '/cwd',
			current: 'feature',
			target: 'main',
			commits: ['same message', 'same message'],
		} as any);
		expect(buildTextResult).toHaveBeenCalled();
		expect(res).toHaveProperty('data');
		expect(res.data.replaced).toBe(0);
	});
});
