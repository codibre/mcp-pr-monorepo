export function log(message: string, ...optionalParams: unknown[]): void {
	console.error(`[mcp-pr-command] ${message}`, ...optionalParams);
}
