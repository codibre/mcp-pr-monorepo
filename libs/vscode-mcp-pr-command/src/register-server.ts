import vscode from 'vscode';

export async function registerServer(output?: vscode.OutputChannel) {
	try {
		const commands = vscode.commands;
		const config = vscode.workspace.getConfiguration();
		const regCmd = config.get<string>('mcpPrCommand.registrationCommand');
		const regPayload = config.get<string>('mcpPrCommand.registrationPayload');

		if (regCmd) {
			const payload =
				regPayload && regPayload.trim()
					? JSON.parse(regPayload)
					: { name: 'mcp-pr-command', description: 'MCP PR Command (local)' };
			const all = await commands.getCommands(true);
			const available = all.includes(regCmd);
			if (available) {
				await commands.executeCommand(regCmd, payload);
				vscode.window.showInformationMessage(
					'MCP server registered via configured registrationCommand.',
				);
				return;
			} else {
				vscode.window.showWarningMessage(
					`Configured registration command ${regCmd} is not available.`,
				);
			}
		}

		const candidates = ['mcp.addServer', 'mcp-pr.addServer', 'mcpPr.addServer'];
		const allCmds = await commands.getCommands(true);
		for (const cmd of candidates) {
			const available = allCmds.includes(cmd);
			if (available) {
				await commands.executeCommand(cmd, {
					name: 'mcp-pr-command',
					port: null,
					description: 'MCP PR Command (local)',
				});
				vscode.window.showInformationMessage(
					'MCP server registered with host extension.',
				);
				return;
			}
		}
		vscode.window.showInformationMessage(
			'No MCP host extension detected to register the server. You can still use the extension output logs to interact with the server.',
		);
	} catch (e) {
		output?.appendLine(`Failed to register MCP server: ${String(e)}`);
		vscode.window.showWarningMessage(
			'Failed to register MCP server with host extension.',
		);
	}
}
