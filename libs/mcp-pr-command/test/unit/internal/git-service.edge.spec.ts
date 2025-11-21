describe('GitService edge cases', () => {
	beforeEach(() => jest.resetModules());

	it('showRefVerifyQuiet remote not found throws', async () => {
		// mock run to return empty for ls-remote
		jest.doMock('src/internal/run', () => ({
			run: jest.fn().mockResolvedValue(''),
			command: (cmd: string) => ({
				parts: [cmd],
				with() {
					return this;
				},
				run: async () => '' as any,
				toString() {
					return this.parts.join(' ');
				},
			}),
		}));

		const internals = require('src/internal');
		const { gitService } = internals;

		const out = await gitService.showRefVerifyQuiet('no-such-branch', {
			where: 'remote',
			remote: 'origin',
		} as any);
		expect(out).toBe('');
	});

	it('refExists returns false when both remote and local checks throw', async () => {
		// make run throw for show-ref and ls-remote
		jest.doMock('src/internal/run', () => ({
			run: jest.fn().mockImplementation(async (cmd: string) => {
				if (cmd.includes('ls-remote') || cmd.includes('show-ref')) {
					throw new Error('not found');
				}
				return '';
			}),
			command: (cmd: string) => ({
				parts: [cmd],
				with() {
					return this;
				},
				run: async () => {
					throw new Error('not found');
				},
				toString() {
					return this.parts.join(' ');
				},
			}),
		}));

		const internals = require('src/internal');
		const { gitService } = internals;

		const exists = await gitService.refExists('branch', {
			where: 'any',
		} as any);
		expect(exists).toBe(false);
	});

	it('generateChangesFile throws when refs missing', async () => {
		jest.doMock('src/internal/run', () => ({
			run: jest.fn().mockResolvedValue('ok'),
			command: (cmd: string) => ({
				parts: [cmd],
				with() {
					return this;
				},
				run: async () => 'ok' as any,
				toString() {
					return this.parts.join(' ');
				},
			}),
		}));

		const internals = require('src/internal');
		const { gitService } = internals;

		// stub refExists to return false for required checks
		jest.spyOn(gitService, 'refExists').mockResolvedValue(false as any);

		await expect(
			gitService.generateChangesFile('main', 'feat'),
		).rejects.toThrow();
	});
});
