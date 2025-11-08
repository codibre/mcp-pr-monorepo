import { McpServer } from './mcp';

export interface ToolRegister {
	registerTool(server: McpServer): void;
}
