import { McpServer, StdioServerTransport } from './internal';
import { context, log, packageInfo } from './internal';
import * as tools from './tools';
import { fluentObject } from '@codibre/fluent-iterable';
import { McpPRCommandOptions } from './mcp-pr-command-options';

export function startServer(options?: McpPRCommandOptions) {
	if (options) {
		const { cardLinkWebSite, cartPathLinkReplacePattern } = options;
		context.cardLinkInferPattern = options.cardLinkInferPattern;
		if (cardLinkWebSite) {
			context.cardLinkWebSitePattern = new RegExp(
				`/${cardLinkWebSite}\/[^\s)]+/g`,
			);
			if (cartPathLinkReplacePattern) {
				const start = cardLinkWebSite.endsWith('/')
					? cardLinkWebSite.substring(0, cardLinkWebSite.length - 1)
					: cardLinkWebSite;
				const end = cartPathLinkReplacePattern.startsWith('/')
					? cartPathLinkReplacePattern.substring(1)
					: cartPathLinkReplacePattern;
				context.prLinkInferPattern = `${start}/${end}`;
			}
		}
	}
	const server = new McpServer({
		name: 'mcp-pr-command',
		version: packageInfo.version ?? '0.0.0',
	});

	fluentObject(tools)
		.map(1)
		.forEach((Cls) => new Cls().registerTool(server));

	const transport = new StdioServerTransport();
	server.connect(transport).catch((error) => {
		log('Failed to start MCP server:', error);
		process.exit(1);
	});
}
