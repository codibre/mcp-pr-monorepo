describe('GitService utility methods', () => {
	beforeEach(() => jest.resetModules());

	test('symbolicRefQuiet delegates to git command', async () => {
		const internals = require('src/internal');
		jest
			.spyOn(internals.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		const runMod = require('src/internal/run');
		const runSpy = jest
			.spyOn(runMod.CommandBuilder.prototype, 'run')
			.mockResolvedValue('refs/heads/main' as any);
		const out = await internals.gitService.symbolicRefQuiet('HEAD');
		expect(out).toBe('refs/heads/main');
		expect(runSpy).toHaveBeenCalled();
	});

	test('createTag runs git tag', async () => {
		const internals = require('src/internal');
		jest
			.spyOn(internals.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		const runMod = require('src/internal/run');
		const runSpy = jest
			.spyOn(runMod.CommandBuilder.prototype, 'run')
			.mockResolvedValue('' as any);
		await internals.gitService.createTag('v1.2.3');
		expect(runSpy).toHaveBeenCalled();
	});

	test('lsRemoteHeads calls ls-remote', async () => {
		const internals = require('src/internal');
		jest
			.spyOn(internals.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		const runMod = require('src/internal/run');
		const runSpy = jest
			.spyOn(runMod.CommandBuilder.prototype, 'run')
			.mockResolvedValue('hash\trefs/heads/main' as any);
		const out = await internals.gitService.lsRemoteHeads('origin', 'main');
		expect(out).toBe('hash\trefs/heads/main');
		expect(runSpy).toHaveBeenCalled();
	});

	test('refExists returns true when showRefVerifyQuiet succeeds and false when it throws', async () => {
		const internals = require('src/internal');
		jest
			.spyOn(internals.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		const showSpy = jest
			.spyOn(internals.gitService, 'showRefVerifyQuiet')
			.mockResolvedValue('ok' as any);
		expect(await internals.gitService.refExists('main')).toBe(true);
		showSpy.mockRejectedValueOnce(new Error('nope'));
		// when showRefVerifyQuiet throws, refExists should return false
		jest
			.spyOn(internals.gitService, 'showRefVerifyQuiet')
			.mockRejectedValue(new Error('nope'));
		expect(await internals.gitService.refExists('main')).toBe(false);
	});

	test('hasRemoteHead returns true when lsRemoteHeads returns output, false on error', async () => {
		const internals = require('src/internal');
		jest
			.spyOn(internals.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		jest.spyOn(internals.gitService, 'lsRemoteHeads').mockResolvedValue('some');
		expect(await internals.gitService.hasRemoteHead('origin', 'main')).toBe(
			true,
		);
		jest
			.spyOn(internals.gitService, 'lsRemoteHeads')
			.mockRejectedValue(new Error('boom'));
		expect(await internals.gitService.hasRemoteHead('origin', 'main')).toBe(
			false,
		);
	});

	test('diff includes --stat when opts.stat is true', async () => {
		const internals = require('src/internal');
		jest
			.spyOn(internals.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		const runMod = require('src/internal/run');
		const runSpy = jest
			.spyOn(runMod.CommandBuilder.prototype, 'run')
			.mockResolvedValue('diffout' as any);
		const out = await internals.gitService.diff('a', 'b', { stat: true });
		expect(out).toBe('diffout');
		expect(runSpy).toHaveBeenCalled();
	});

	test('fastForwardBranch delegates to branchForceUpdate', async () => {
		const internals = require('src/internal');
		const bf = jest
			.spyOn(internals.gitService, 'branchForceUpdate')
			.mockResolvedValue('updated' as any);
		const out = await internals.gitService.fastForwardBranch(
			'local',
			'origin/remote',
		);
		expect(out).toBe('updated');
		expect(bf).toHaveBeenCalledWith('local', 'origin/remote');
	});

	test('checkoutBranch creates new branch with and without startPoint', async () => {
		const internals = require('src/internal');
		jest
			.spyOn(internals.contextService, 'cwd', 'get')
			.mockReturnValue(process.cwd());
		const runMod = require('src/internal/run');
		const runSpy = jest
			.spyOn(runMod.CommandBuilder.prototype, 'run')
			.mockResolvedValue('' as any);
		await internals.gitService.checkoutBranch('newbranch', {
			new: true,
			startPoint: 'main',
		});
		expect(runSpy).toHaveBeenCalled();
		await internals.gitService.checkoutBranch('otherbranch', { new: true });
		expect(runSpy).toHaveBeenCalled();
	});
});
