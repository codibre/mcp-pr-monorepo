import vscode from 'vscode';
import { resolveMcpCli } from './cli-resolver';
import { spawnMcp, writeTmpOptions, cleanupTmpFile } from './process-manager';
import { registerServer as registerServerCmd } from './register-server';

let childProcessDisposable: { dispose: () => void } | null = null;

function buildOptionsFromConfig() {
	const config = vscode.workspace.getConfiguration();
	return {
		cardLinkWebSite: config.get('mcpPrCommand.cardLinkWebSite'),
		cartPathLinkReplacePattern: config.get(
			'mcpPrCommand.cartPathLinkReplacePattern',
		),
		branchCardIdExtractPattern: config.get(
			'mcpPrCommand.branchCardIdExtractPattern',
		),
		complementaryMcpDescription: config.get(
			'mcpPrCommand.complementaryMcpDescription',
		),
	};
}

export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration();
	const autoStart = config.get<boolean>('mcpPrCommand.autoStart', true);
	if (!autoStart) return;

	if (vscode.workspace.isTrusted === false) {
		vscode.window.showWarningMessage(
			'Workspace is not trusted; MCP server will not be auto-started.',
		);
		return;
	}

	const opts = buildOptionsFromConfig();
	const outputChannel = vscode.window.createOutputChannel('MCP PR Command');
	context.subscriptions.push(outputChannel);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			'vscode-mcp-pr-command.registerServer',
			() => registerServerCmd(outputChannel),
		),
	);

	const tmpFile = writeTmpOptions(context, opts);
	const resolved = resolveMcpCli();
	if (resolved.cliPath) {
		outputChannel.appendLine(
			`Resolved mcp-pr-command CLI at ${resolved.cliPath}`,
		);
	} else {
		outputChannel.appendLine(`MCP CLI resolution failed: ${resolved.reason}`);
	}

	const { child } = spawnMcp(resolved.cliPath, tmpFile, outputChannel);
	if (child) {
		if (child.stdout) {
			child.stdout.on('data', (d: Buffer) =>
				outputChannel.append(d.toString()),
			);
		}
		if (child.stderr) {
			child.stderr.on('data', (d: Buffer) =>
				outputChannel.append(d.toString()),
			);
		}
		child.on('exit', (code, signal) =>
			outputChannel.appendLine(
				`MCP server exited with code ${code} signal ${signal}`,
			),
		);

		childProcessDisposable = {
			dispose: () => {
				try {
					child.kill();
				} catch {
					/* best effort */
				}
			},
		};
		context.subscriptions.push(childProcessDisposable);
	}

	const TMP_CLEANUP_DELAY = 2000;
	// cleanup tmp file after short delay — the CLI should read it at startup
	setTimeout(() => cleanupTmpFile(tmpFile, outputChannel), TMP_CLEANUP_DELAY);
}

export function deactivate() {
	if (childProcessDisposable) childProcessDisposable.dispose();
}
