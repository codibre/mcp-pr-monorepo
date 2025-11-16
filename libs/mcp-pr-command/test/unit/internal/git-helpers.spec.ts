describe('git-helpers', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	it('refExists returns true when execSync does not throw', () => {
		jest.doMock('child_process', () => ({
			execSync: jest.fn().mockImplementation(() => 'ok'),
		}));
		const { refExists } = require('src/internal/git-helpers');
		expect(refExists('refs/heads/main', '/cwd')).toBe(true);
	});

	it('refExists returns false when execSync throws', () => {
		jest.doMock('child_process', () => ({
			execSync: jest.fn().mockImplementation(() => {
				throw new Error('no');
			}),
		}));
		const { refExists } = require('src/internal/git-helpers');
		expect(refExists('nope', '/cwd')).toBe(false);
	});

	it('fetchRemoteBranch throws helpful error when git fetch fails', () => {
		jest.doMock('child_process', () => ({
			execSync: jest.fn().mockImplementation(() => {
				throw new Error('fetch failed');
			}),
		}));
		const { fetchRemoteBranch } = require('src/internal/git-helpers');
		expect(() => fetchRemoteBranch('main', '/cwd')).toThrow(
			/Failed to fetch remote branch/,
		);
	});

	it('createLocalBranchFromRemote throws helpful error on failure', () => {
		jest.doMock('child_process', () => ({
			execSync: jest.fn().mockImplementation(() => {
				throw new Error('branch failed');
			}),
		}));
		const { createLocalBranchFromRemote } = require('src/internal/git-helpers');
		expect(() =>
			createLocalBranchFromRemote('local', 'origin/main', '/cwd'),
		).toThrow(/Failed to create local branch/);
	});

	it('fastForwardBranch calls execSync without throwing', () => {
		jest.doMock('child_process', () => ({
			execSync: jest.fn().mockImplementation(() => 'ok'),
		}));
		const { fastForwardBranch } = require('src/internal/git-helpers');
		expect(() =>
			fastForwardBranch('local', 'origin/main', '/cwd'),
		).not.toThrow();
	});

	it('revParse returns trimmed output', () => {
		jest.doMock('child_process', () => ({
			execSync: jest.fn().mockImplementation(() => 'abc\n'),
		}));
		const { revParse } = require('src/internal/git-helpers');
		expect(revParse('HEAD', '/cwd')).toBe('abc');
	});
});
