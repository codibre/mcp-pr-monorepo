import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { attempt } from './attempt';
import { getErrorMessage } from '.';

export async function createTempFile(
	fileName: string,
	content: string,
	cwd: string,
) {
	const tempFilePath = path.join(cwd, '.tmp', fileName);
	await fs.promises.mkdir(path.dirname(tempFilePath), { recursive: true });
	await fs.promises.writeFile(tempFilePath, content, { encoding: 'utf8' });
	return tempFilePath;
}

export function createBackupTag(branchName: string, cwd: string) {
	const timestamp = Date.now();
	const backupTag = `backup/${branchName}/${timestamp}`;
	try {
		execSync(`git tag ${backupTag}`, { encoding: 'utf8', cwd });
		return backupTag;
	} catch (e) {
		throw new Error(`Failed to create backup tag: ${getErrorMessage(e)}`);
	}
}

export const clearTempDir = (cwd: string) =>
	attempt(() => fs.promises.rmdir(path.join(cwd, '.tmp'), { recursive: true }));

export async function generateChangesFile(
	targetBranch: string,
	currentBranch: string,
	cwd: string,
) {
	const commits = execSync(
		`git log origin/${targetBranch}..${currentBranch} --pretty=format:%B%n---ENDCOMMIT---`,
		{ encoding: 'utf8', cwd },
	).trim();
	const commitEntries = commits
		.split('\n---ENDCOMMIT---\n')
		.map((c) => c.trim())
		.filter(Boolean);
	const commitsTruncated = commitEntries.join('\n\n---\n\n');
	const diffSummary =
		execSync(`git diff origin/${targetBranch}...${currentBranch} --stat`, {
			encoding: 'utf8',
			cwd,
		}).trim() || 'No diff available';
	let codeDiff = '';
	try {
		codeDiff = execSync(`git diff origin/${targetBranch}...${currentBranch}`, {
			encoding: 'utf8',
			cwd,
		}).trim();
	} catch {
		codeDiff = 'No code diff available';
	}
	const changesContent = `=== COMMITS ===\n${commitsTruncated}\n\n=== DIFF SUMMARY ===\n${diffSummary}\n\n=== CODE DIFF ===\n${codeDiff}`;
	const changesFile = await createTempFile(
		'.copilot-changes.txt',
		changesContent,
		cwd,
	);
	return changesFile;
}
