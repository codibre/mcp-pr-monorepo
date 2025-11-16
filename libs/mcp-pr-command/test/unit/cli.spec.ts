import fs from 'fs';

describe('cli script', () => {
	const OLD_ARGV = process.argv;
	beforeEach(() => {
		jest.resetModules();
		process.argv = [...OLD_ARGV.slice(0, 2)];
	});
	afterEach(() => {
		process.argv = OLD_ARGV;
		jest.restoreAllMocks();
	});

	it('calls startServer when no options provided', () => {
		const start = jest.fn();
		jest.doMock('src/main', () => ({ startServer: start }));
		// require the CLI (it will parse argv and call startServer)
		// ensure no exit is called
		jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
			throw new Error('process.exit called ' + code);
		}) as any);

		// Importing should not throw
		expect(() => require('src/cli')).not.toThrow();
		expect(start).toHaveBeenCalledWith(undefined);
	});

	it('exits with code 1 when invalid JSON passed to --mcp-options', () => {
		const log = jest.fn();
		jest.doMock('src/internal', () => ({
			getErrorMessage: (e: any) => String(e),
			log,
		}));
		const start = jest.fn();
		jest.doMock('src/main', () => ({ startServer: start }));

		process.argv = [...process.argv, '--mcp-options', '{badJson'];

		const exitSpy = jest.spyOn(process, 'exit').mockImplementation(((
			code?: number,
		) => {
			throw new Error('exit:' + code);
		}) as any);

		expect(() => require('src/cli')).toThrow(/exit:1/);
		expect(log).toHaveBeenCalled();
		exitSpy.mockRestore();
	});

	it('reads options file when --mcp-options-file provided and passes parsed options', () => {
		const opts = { cardLinkWebSite: 'example' };
		const start = jest.fn();
		jest.doMock('src/main', () => ({ startServer: start }));
		const readSpy = jest
			.spyOn(fs, 'readFileSync')
			.mockImplementation(() => JSON.stringify(opts) as any);

		process.argv = [...process.argv, '--mcp-options-file', 'somefile.json'];

		expect(() => require('src/cli')).not.toThrow();
		expect(readSpy).toHaveBeenCalledWith('somefile.json', 'utf8');
		expect(start).toHaveBeenCalledWith(opts);
	});
});
