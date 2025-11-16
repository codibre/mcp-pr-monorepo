import { AsyncLocalStorage } from 'async_hooks';
import { McpServer, normalizePath, ToolCallback } from '../internal';
import {
	CallToolResult,
	ToolAnnotations,
} from '@modelcontextprotocol/sdk/types';
import { ZodRawShape } from 'zod';
import { assertDefined } from 'is-this-a-pigeon';

type Store = {
	cwd?: string;
};

class ContextService {
	private als = new AsyncLocalStorage<Store>();

	wrapCallback<
		F extends (params: T) => Promise<CallToolResult>,
		T extends { cwd: string },
	>(fn: F): ToolCallback<ZodRawShape> {
		return (params: T) => {
			// normalizePath is async now; compute cwd before running the ALS context
			return (async () => {
				const normalized = await normalizePath(params.cwd);
				// AsyncLocalStorage.run accepts a callback that may return a Promise
				return await this.als.run({ cwd: normalized }, () =>
					fn.call(undefined, params),
				);
			})();
		};
	}

	registerTool<
		F extends (params: T) => Promise<CallToolResult>,
		T extends { cwd: string },
		OutputArgs extends ZodRawShape,
	>(
		server: McpServer,
		name: string,
		config: {
			title?: string;
			description?: string;
			inputSchema?: ZodRawShape;
			outputSchema?: OutputArgs;
			annotations?: ToolAnnotations;
			_meta?: Record<string, unknown>;
		},
		cb: F,
	) {
		return server.registerTool(name, config, this.wrapCallback(cb));
	}

	get cwd(): string {
		const cwd = this.als.getStore()?.cwd;
		assertDefined(cwd, 'cwd is not defined in ContextService store');
		return cwd;
	}
}

export const contextService = new ContextService();
