import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';

export * from '@modelcontextprotocol/sdk/server/mcp.js';
export * from '@modelcontextprotocol/sdk/server/stdio.js';

// Helper: produce an object type from a record of Zod schemas where
// - keys whose inferred type may include `undefined` become optional properties
//   and their type has `undefined` excluded
// - other keys are required with the inferred type
export type Infer<T extends Record<string, z.ZodTypeAny>> =
	// optional keys: those whose inferred type includes `undefined`
	{
		[K in keyof T as undefined extends z.infer<T[K]> ? K : never]?: Exclude<
			z.infer<T[K]>,
			undefined
		>;
	} & {
		// required keys: those whose inferred type does NOT include `undefined`
		[K in keyof T as undefined extends z.infer<T[K]> ? never : K]: z.infer<
			T[K]
		>;
	};

export type McpResult<T extends Record<string, z.ZodTypeAny>> =
	CallToolResult & {
		structuredContent?: Infer<T>;
	};
