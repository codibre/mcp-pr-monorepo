import { ChildProcess, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import vscode from 'vscode';

export type SpawnResult = { child?: ChildProcess; usedNpx?: boolean };

export function spawnMcp(
	cliPath: string | undefined,
	tmpFile: string,
	output?: vscode.OutputChannel,
): SpawnResult {
	let child: ChildProcess | undefined;
	if (cliPath) {
		child = spawn(process.execPath, [cliPath, '--mcp-options-file', tmpFile], {
			stdio: ['ignore', 'pipe', 'pipe'],
			detached: false,
		});
		output?.appendLine(`Spawning node ${cliPath}`);
		return { child, usedNpx: false };
	}
	// fallback to npx
	child = spawn(
		'npx',
		['--no-install', 'mcp-pr-command', '--mcp-options-file', tmpFile],
		{ stdio: ['ignore', 'pipe', 'pipe'], detached: false },
	);
	output?.appendLine('Falling back to npx to run mcp-pr-command');
	return { child, usedNpx: true };
}

export function writeTmpOptions(
	context: vscode.ExtensionContext,
	opts: unknown,
): string {
	const tmpDir = path.join(context.globalStoragePath || os.tmpdir());
	fs.mkdirSync(tmpDir, { recursive: true });
	const tmpFile = path.join(
		tmpDir,
		`mcp-pr-command-options-${process.pid}-${Date.now()}.json`,
	);
	fs.writeFileSync(tmpFile, JSON.stringify(opts));
	return tmpFile;
}

export function cleanupTmpFile(tmpFile: string, output?: vscode.OutputChannel) {
	try {
		fs.unlinkSync(tmpFile);
	} catch (e) {
		output?.appendLine(`Failed to remove tmp file: ${String(e)}`);
	}
}
