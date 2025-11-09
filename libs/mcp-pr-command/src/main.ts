import { McpServer, StdioServerTransport } from './internal';
import { context, log, packageInfo } from './internal';
import * as tools from './tools';
import { fluentObject } from '@codibre/fluent-iterable';
import { McpPRCommandOptions } from './mcp-pr-command-options';

/**
 * Starts the MCP PR Command server with the provided options.
 *
 * This function initializes the MCP server, configures the context with the given options,
 * sets up card link and PR link inference patterns, registers all available tools, and
 * connects the server to the standard I/O transport. If the server fails to start, the process exits with an error.
 *
 * @param options - Optional configuration for the MCP PR Command server, including card link website,
 *   card path link pattern, language, and other behavioral settings. See {@link McpPRCommandOptions} for details.
 */
export function startServer(options?: McpPRCommandOptions) {
	if (options) {
		const { cardLinkWebSite, cartPathLinkReplacePattern } = options;
		Object.assign(context, options);
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
	let title =
		'MCP used for Pull Request opening and updating, and commit messages rewriting';
	if (options?.complementaryMcpDescription) {
		title += ` - ${options.complementaryMcpDescription}`;
	}
	const server = new McpServer({
		name: 'mcp-pr-command',
		version: packageInfo.version ?? '0.0.0',
		title,
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
