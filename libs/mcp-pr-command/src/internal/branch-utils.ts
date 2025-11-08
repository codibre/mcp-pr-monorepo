import fs from 'fs';
import path from 'path';

export function getBranchSchema(cwd: string) {
	const schema: {
		feat: string;
		fix: string;
		hotfix: string;
		release: string;
		dev: string;
	} = {
		feat: 'staging',
		fix: 'staging',
		hotfix: 'main',
		release: 'staging',
		dev: 'develop',
	};
	const iniPath = path.join(cwd, 'branches.ini');
	if (fs.existsSync(iniPath)) {
		const ini = fs.readFileSync(iniPath, 'utf8');
		for (const line of ini.split(/\r?\n/)) {
			const m = line.match(/^(FEAT|BUGFIX|HOTFIX|RELEASE|DEV)_BRANCH=(.+)$/i);
			if (m) {
				const key = m[1]?.toLowerCase();
				const val = m[2]?.trim();
				if (!key || !val) continue;
				if (key === 'feat') schema.feat = val;
				if (key === 'bugfix') schema.fix = val;
				if (key === 'hotfix') schema.hotfix = val;
				if (key === 'release') schema.release = val;
				if (key === 'dev') schema.dev = val;
			}
		}
	}
	return schema;
}

export function isProtectedBranch(branchName: string, cwd: string) {
	const schema = getBranchSchema(cwd);
	const protectedBranches = new Set(Object.values(schema));
	return protectedBranches.has(branchName);
}
