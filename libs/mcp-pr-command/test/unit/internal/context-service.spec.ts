import { contextService } from 'src/internal';
import * as pathUtils from 'src/internal/path-utils';

describe('ContextService', () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	it('cwd getter throws when no ALS store is set', () => {
		expect(() => contextService.cwd).toThrow(/cwd is not defined/);
	});

	it('wrapCallback normalizes cwd and provides it inside the callback', async () => {
		jest.spyOn(pathUtils, 'normalizePath').mockResolvedValue('/normalized');

		const fn = jest.fn(async (params: { cwd: string }) => {
			// inside the wrapped callback, contextService.cwd should be the normalized value
			return { cwdInside: contextService.cwd, received: params.cwd };
		});

		const wrapped = contextService.wrapCallback(fn as any);
		const result = await wrapped({ cwd: 'raw-path' }, undefined as any);

		expect(pathUtils.normalizePath).toHaveBeenCalledWith('raw-path');
		expect(result).toEqual({ cwdInside: '/normalized', received: 'raw-path' });
	});

	it('registerTool forwards to server.registerTool with wrapped callback', () => {
		const server: any = { registerTool: jest.fn() };
		const cb = async (_params: { cwd: string }) => ({ ok: true });
		contextService.registerTool(server, 'my-tool', { title: 't' }, cb as any);
		expect(server.registerTool).toHaveBeenCalled();
		const callArgs = server.registerTool.mock.calls[0];
		expect(callArgs[0]).toBe('my-tool');
		// third argument should be a function (the wrapped callback)
		expect(typeof callArgs[2]).toBe('function');
	});
});
