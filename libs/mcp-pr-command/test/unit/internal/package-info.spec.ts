describe('package-info', () => {
	const pkg = { name: 'mcp-pr-command', version: '9.9.9' };

	beforeEach(() => {
		jest.resetModules();
	});

	it('reads package.json when present', () => {
		// Mock attempt helper to return the package object
		jest.doMock('src/internal/attempt', () => ({ attempt: () => pkg }));
		const { packageInfo } = require('src/internal/package-info');
		expect(packageInfo.version).toBe('9.9.9');
		expect(packageInfo.name).toBe('mcp-pr-command');
	});

	it('falls back to empty object when package.json missing', () => {
		// Mock attempt to return undefined to simulate missing package.json
		jest.doMock('src/internal/attempt', () => ({ attempt: () => undefined }));
		const { packageInfo } = require('src/internal/package-info');
		expect(packageInfo).toEqual({});
	});
});
