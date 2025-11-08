import child_process from 'child_process';
import fs from 'fs';

export function isWsl(): boolean {
	try {
		return fs
			.readFileSync('/proc/version', 'utf8')
			.toLowerCase()
			.includes('microsoft');
	} catch {
		return false;
	}
}

// Helper to convert paths using wslpath when available. Returns null on failure.
export function wslpath(p: string, toWin = true): string | null {
	try {
		return child_process
			.execFileSync('wslpath', [toWin ? '-w' : '-u', p], { encoding: 'utf8' })
			.toString()
			.trim();
	} catch {
		return null;
	}
}
