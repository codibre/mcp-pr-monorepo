import {
	execFileSync,
	execSync,
	ExecFileSyncOptionsWithStringEncoding,
	ExecSyncOptionsWithStringEncoding,
} from 'child_process';

export function safeExecFileSync(
	cmd: string,
	args: string[] = [],
	opts?: ExecFileSyncOptionsWithStringEncoding,
): string | Buffer | null {
	try {
		return execFileSync(cmd, args, opts);
	} catch {
		return null;
	}
}

export function safeExecSync(
	cmd: string,
	opts?: ExecSyncOptionsWithStringEncoding,
): string | Buffer | null {
	try {
		return execSync(cmd, opts);
	} catch {
		return null;
	}
}

export default { safeExecFileSync, safeExecSync };
