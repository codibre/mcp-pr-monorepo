import { z } from 'zod';
import { Infer, McpResult } from './mcp';

export function buildTextResult<T extends Record<string, z.ZodTypeAny>>(
	text: string,
	structuredContent?: Infer<T>,
): McpResult<T> {
	return {
		content: [
			{
				type: 'text',
				text,
			},
		],
		structuredContent,
	};
}
