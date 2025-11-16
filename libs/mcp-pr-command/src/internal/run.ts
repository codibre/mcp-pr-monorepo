import { promisify } from 'util';
import { exec, ExecOptions } from 'child_process';
import { contextService } from './context-service';
import { attempt } from './attempt';

const execAsync = promisify(exec);

export async function run(cmd: string, options?: ExecOptions) {
	const cwd = options?.cwd ?? contextService.cwd;
	const opts: ExecOptions = {
		encoding: 'utf8',
		cwd,
		...(options || {}),
	};
	// require exec dynamically so tests can mock child_process.exec

	console.error(`Running command: ${cmd}`);
	const res = await execAsync(cmd, opts);
	return res.stdout?.toString().trim() ?? '';
}

export class CommandBuilder {
	constructor(private parts: string[] = []) {}
	with(...more: string[]) {
		this.parts.push(...more);
		return this;
	}
	ifWith(condition: unknown, ...more: string[]) {
		if (condition) {
			this.parts.push(...more);
		}
		return this;
	}
	toString() {
		return this.parts.join(' ');
	}
	async run(options?: ExecOptions) {
		return await run(this.toString(), options);
	}
}

export function command(cmd: string): CommandBuilder {
	return new CommandBuilder([cmd]);
}

/**
 * attemptRun: run a command and catch errors via the provided catch callback
 * @param commands - commands to run
 */
export async function attemptRun(...commands: string[]) {
	for (const cmd of commands) await attempt(async () => await run(cmd));
}
