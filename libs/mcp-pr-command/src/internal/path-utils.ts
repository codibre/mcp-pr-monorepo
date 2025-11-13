import { execSync } from 'child_process';

/**
 * Detects if we're running in WSL
 */
export function isWSL(): boolean {
	try {
		const release = execSync('uname -r', { encoding: 'utf8' });
		return release.toLowerCase().includes('microsoft');
	} catch {
		return false;
	}
}

/**
 * Converts a Windows path to WSL format
 * C:\Users\foo\project -> /mnt/c/Users/foo/project
 */
export function windowsToWSL(path: string): string {
	if (!path.match(/^[A-Za-z]:\\/)) {
		return path; // Already WSL format or relative
	}

	try {
		const result = execSync(`wslpath "${path}"`, {
			encoding: 'utf8',
		}).trim();
		return result;
	} catch {
		// Fallback: manual conversion
		// Example: C:\path -> /mnt/c/path
		const drive = path.charAt(0).toLowerCase();
		const pathAfterColon = 3; // Skip "C:\"
		const restPath = path.slice(pathAfterColon).replace(/\\/g, '/');
		return `/mnt/${drive}/${restPath}`;
	}
}

/**
 * Converts a WSL path to Windows format
 * /mnt/c/Users/foo/project -> C:\Users\foo\project
 */
export function wslToWindows(path: string): string {
	if (!path.startsWith('/mnt/')) {
		return path; // Not a WSL mount path
	}

	try {
		const result = execSync(`wslpath -w "${path}"`, {
			encoding: 'utf8',
		}).trim();
		return result;
	} catch {
		// Fallback: manual conversion
		const match = path.match(/^\/mnt\/([a-z])\/(.*)/);
		if (match && match[1] && match[2]) {
			const drive = match[1].toUpperCase();
			const restPath = match[2].replace(/\//g, '\\');
			return `${drive}:\\${restPath}`;
		}
		return path;
	}
}

/**
 * Normalizes a path to the format expected by the current environment
 * - If running in WSL and receives Windows path -> converts to WSL
 * - If running in Windows and receives WSL path -> converts to Windows
 */
export function normalizePath(path: string): string {
	if (!path) return path;

	const runningInWSL = isWSL();

	// If we're in WSL and got a Windows path
	if (runningInWSL && path.match(/^[A-Za-z]:\\/)) {
		return windowsToWSL(path);
	}

	// If we're NOT in WSL and got a WSL path
	if (!runningInWSL && path.startsWith('/mnt/')) {
		return wslToWindows(path);
	}

	return path;
}
