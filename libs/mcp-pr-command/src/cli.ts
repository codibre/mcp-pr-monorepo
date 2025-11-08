import { readFileSync } from 'fs';
import { Command } from 'commander';
import { startServer } from './main';
import { McpPRCommandOptions } from './mcp-pr-command-options';
import { getErrorMessage } from './internal';

const program = new Command();

program
	.name('mcp-pr-command')
	.description('MCP PR Command CLI')
	.option('-o, --mcp-options <json>', 'Inline JSON options')
	.option('-f, --mcp-options-file <path>', 'Path to JSON options file')
	.allowUnknownOption(false);

program.parse(process.argv);

const cliOpts = program.opts();

let options: McpPRCommandOptions | undefined;

if (cliOpts.mcpOptions) {
	try {
		options = JSON.parse(cliOpts.mcpOptions);
	} catch (err) {
		console.error(
			'Invalid JSON passed to --mcp-options:',
			getErrorMessage(err),
		);
		process.exit(1);
	}
} else if (cliOpts.mcpOptionsFile) {
	try {
		const raw = readFileSync(cliOpts.mcpOptionsFile, 'utf8');
		options = JSON.parse(raw);
	} catch (err) {
		console.error('Failed to read/parse options file:', getErrorMessage(err));
		process.exit(1);
	}
}

startServer(options);
