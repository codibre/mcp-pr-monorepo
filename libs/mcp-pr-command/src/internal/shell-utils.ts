import {
	execFileSync,
	execSync,
	ExecFileSyncOptionsWithStringEncoding,
	ExecSyncOptionsWithStringEncoding,
} from 'child_process';
import { attempt } from './attempt';

export const safeExecFileSync = (
	cmd: string,
	args: string[] = [],
	opts?: ExecFileSyncOptionsWithStringEncoding,
): string | Buffer | null =>
	attempt(
		() => execFileSync(cmd, args, opts),
		() => null,
	);

export const safeExecSync = (
	cmd: string,
	opts?: ExecSyncOptionsWithStringEncoding,
): string | Buffer | null =>
	attempt(
		() => execSync(cmd, opts),
		() => null,
	);
