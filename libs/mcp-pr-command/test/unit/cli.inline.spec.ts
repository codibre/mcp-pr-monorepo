describe('cli script - inline options', () => {
	const OLD_ARGV = process.argv;
	beforeEach(() => {
		jest.resetModules();
		process.argv = [...OLD_ARGV.slice(0, 2)];
	});
	afterEach(() => {
		process.argv = OLD_ARGV;
		jest.restoreAllMocks();
	});

	it('parses inline JSON and calls startServer with object', () => {
		const start = jest.fn();
		jest.doMock('src/main', () => ({ startServer: start }));
		const opts = { example: true };
		process.argv = [...process.argv, '--mcp-options', JSON.stringify(opts)];

		expect(() => require('src/cli')).not.toThrow();
		expect(start).toHaveBeenCalledWith(opts);
	});
});
