import fs from 'fs';

describe('cli script - file error', () => {
	const OLD_ARGV = process.argv;
	beforeEach(() => {
		jest.resetModules();
		process.argv = [...OLD_ARGV.slice(0, 2)];
	});
	afterEach(() => {
		process.argv = OLD_ARGV;
		jest.restoreAllMocks();
	});

	it('logs and exits when options file cannot be read/parsed', () => {
		const log = jest.fn();
		jest.doMock('src/internal', () => ({
			getErrorMessage: (e: any) => String(e),
			log,
		}));
		const start = jest.fn();
		jest.doMock('src/main', () => ({ startServer: start }));

		jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
			throw new Error('nope');
		});

		process.argv = [...process.argv, '--mcp-options-file', 'badfile.json'];

		const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((
			code?: number,
		) => {
			throw new Error('exit:' + code);
		}) as any);

		expect(() => require('src/cli')).toThrow(/exit:1/);
		expect(log).toHaveBeenCalled();
		exitSpy.mockRestore();
	});
});
