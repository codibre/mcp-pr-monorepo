describe('GitService - basic commands', () => {
	let runModule: any;
	let runSpy: jest.SpyInstance;
	let gitService: any;
	let contextService: any;

	beforeEach(() => {
		jest.resetModules();
		// Mock the run module early to avoid spawning a real shell
		jest.doMock('src/internal/run', () => {
			const runMock = jest.fn();
			class CommandBuilder {
				constructor(
					private runFn: any,
					private parts: string[] = [],
				) {}
				with(...more: string[]) {
					this.parts.push(...more);
					return this;
				}
				ifWith(condition: unknown, ...more: string[]) {
					if (condition) this.parts.push(...more);
					return this;
				}
				toString() {
					return this.parts.join(' ');
				}
				async run() {
					return await runMock(this.toString());
				}
			}
			return {
				run: runMock,
				command: (cmd: string) => new CommandBuilder(runMock, [cmd]),
			};
		});

		const internals = require('src/internal');
		contextService = internals.contextService;
		gitService = internals.gitService;
		// ensure contextService.cwd exists for run()
		jest.spyOn(contextService, 'cwd', 'get').mockReturnValue('/cwd');
		runModule = require('src/internal/run');
		runSpy = jest.spyOn(runModule, 'run');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('revParseAbbrevRef/listBranches/mergeBase/revListCountBetween', async () => {
		runSpy.mockImplementation(async (cmd: string) => {
			if (cmd.includes('rev-parse')) return 'feature-branch';
			if (cmd.includes('branch')) return '* main\n  feature';
			if (cmd.includes('merge-base')) return 'abc123';
			if (cmd.includes('rev-list')) return '7';
			return '';
		});

		const r = await gitService.revParseAbbrevRef();
		expect(r).toBe('feature-branch');

		const branches = await gitService.listBranches();
		expect(branches).toEqual(['main', 'feature']);

		const mb = await gitService.mergeBase('a', 'b');
		expect(mb).toBe('abc123');

		const count = await gitService.revListCountBetween('a', 'b');
		expect(count).toBe(7);
	});

	it('logRange produces hashes/messages depending on format', async () => {
		runSpy.mockResolvedValue('OUT');
		const out1 = await gitService.logRange('t', 'c', { format: 'messages' });
		expect(out1).toBe('OUT');
		const out2 = await gitService.logRange('t', 'c', { format: 'hashes' });
		expect(out2).toBe('OUT');
	});

	it('showRefVerifyQuiet remote and local', async () => {
		runSpy.mockImplementation(async (cmd: string) => {
			if (cmd.includes('ls-remote')) return 'hash';
			if (cmd.includes('show-ref')) return '';
			return '';
		});

		const remote = await gitService.showRefVerifyQuiet('main', {
			where: 'remote',
			remote: 'origin',
		} as any);
		expect(remote).toBe('hash');

		const local = await gitService.showRefVerifyQuiet('refs/heads/main');
		expect(local).toBe('');
	});

	it('fetch throws custom error when underlying run fails, tryFetch swallows', async () => {
		runSpy.mockImplementation(async (cmd: string) => {
			if (cmd.includes('fetch')) throw new Error('git fetch failed');
			return '';
		});

		await expect(gitService.fetch('feature')).rejects.toThrow(
			/Failed to fetch remote branch/,
		);

		jest.spyOn(gitService, 'fetch').mockRejectedValue(new Error('boom'));
		// tryFetch should not throw even if fetch rejects (attempt wraps errors)
		await expect(gitService.tryFetch('a', 'b')).resolves.toBeUndefined();
	});

	it('createLocalBranchFromRemote success and failure', async () => {
		runSpy.mockResolvedValue('ok');
		const ok = await gitService.createLocalBranchFromRemote('local', 'remote');
		expect(ok).toBe('ok');

		runSpy.mockRejectedValue(new Error('fail'));
		await expect(
			gitService.createLocalBranchFromRemote('l', 'r'),
		).rejects.toThrow(/Failed to create local branch/);
	});

	it('checkoutBranch new & existing, reset variants, commit, delete branch/tag, showCommitBody', async () => {
		const calls: string[] = [];
		runSpy.mockImplementation(async (cmd: string) => {
			calls.push(cmd);
			if (cmd.includes('show -s')) return 'body\r\n';
			return 'ok';
		});

		expect(
			await gitService.checkoutBranch('b', { new: true, startPoint: 'sp' }),
		).toBe('ok');
		expect(await gitService.checkoutBranch('b')).toBe('ok');

		expect(await gitService.reset({ mode: 'soft' })).toBe('ok');
		expect(await gitService.reset({ ref: 'v1' })).toBe('ok');
		expect(await gitService.reset()).toBe('ok');

		expect(await gitService.commit({ msgFile: 'file' })).toBe('ok');
		expect(await gitService.commit({ msg: 'hello' })).toBe('ok');
		expect(await gitService.commit({ amend: true, msg: 'a' })).toBe('ok');

		expect(await gitService.deleteBranch('b')).toBe('ok');
		expect(await gitService.deleteTag('t')).toBe('ok');

		const body = await gitService.showCommitBody('h');
		expect(body).toBe('body');
	});

	it('revParseHead/branchForceUpdate/clean/statusPorcelain/push/filterBranchMsgFilter', async () => {
		runSpy.mockResolvedValue('ok');
		expect(await gitService.revParseHead()).toBe('ok');
		expect(await gitService.branchForceUpdate('b', 'r')).toBe('ok');
		expect(await gitService.clean()).toBe('ok');
		expect(await gitService.statusPorcelain()).toBe('ok');
		expect(await gitService.push('origin', 'main', { force: true })).toBe('ok');
		expect(await gitService.filterBranchMsgFilter('a', 'b', '/script')).toBe(
			'ok',
		);
	});
});
