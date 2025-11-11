import path from 'path';
import fs from 'fs';

export function resolveMcpCli(): { cliPath?: string; reason?: string } {
	try {
		const pkgJsonPath = require.resolve('mcp-pr-command/package.json');

		const pkg: { bin?: string | Record<string, string> } = require(pkgJsonPath);
		const pkgDir = path.dirname(pkgJsonPath);
		let rel: string | null = null;
		if (pkg && pkg.bin) {
			if (typeof pkg.bin === 'string') rel = pkg.bin;
			else if (typeof pkg.bin === 'object') {
				rel =
					pkg.bin['mcp-pr-command'] || (Object.values(pkg.bin)[0] as string);
			}
		}
		const candidates: string[] = [];
		if (rel) candidates.push(path.join(pkgDir, rel));
		candidates.push(path.join(pkgDir, 'bin', 'cli.js'));
		candidates.push(path.join(pkgDir, 'bin', 'mcp-pr-command.js'));
		candidates.push(path.join(pkgDir, 'lib', 'cli.js'));
		candidates.push(path.join(pkgDir, 'dist', 'cli.js'));
		candidates.push(path.join(pkgDir, 'index.js'));

		const found = candidates.find((c) => fs.existsSync(c));
		if (found) return { cliPath: found };
		return { reason: 'could not locate CLI inside package' };
	} catch (e) {
		return { reason: String(e) };
	}
}
