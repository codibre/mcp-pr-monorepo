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

// Helper to check if a branch exists (local or remote)
export function branchExists(branch: string, cwd: string): boolean {
	try {
		// Try local branch first
		execSync(`git show-ref --verify --quiet refs/heads/${branch}`, {
			encoding: 'utf8',
			cwd,
		});
		return true;
	} catch {
		// Try remote branch
		try {
			const out = execSync(`git ls-remote --heads origin ${branch}`, {
				encoding: 'utf8',
				cwd,
			}).trim();
			return !!out;
		} catch {
			return false;
		}
	}
}

// Helper to check if a branch exists locally only
export function branchExistsLocally(branch: string, cwd: string): boolean {
	try {
		execSync(`git show-ref --verify --quiet refs/heads/${branch}`, {
			encoding: 'utf8',
			cwd,
		});
		return true;
	} catch {
		return false;
	}
}

// Helper to resolve a branch to its actual git ref (tries local, then remote)
function resolveBranchRef(branch: string, cwd: string): string | null {
	// Check if ref exists directly
	function refExists(ref: string): boolean {
		try {
			execSync(`git rev-parse --verify --quiet ${ref}`, {
				encoding: 'utf8',
				cwd,
			});
			return true;
		} catch {
			return false;
		}
	}

	// Try local branch first, then remote
	const candidates = [branch, `origin/${branch}`];
	for (const candidate of candidates) {
		if (refExists(candidate)) {
			return candidate;
		}
	}

	return null;
}

export const clearTempDir = (cwd: string) =>
	attempt(() => fs.promises.rmdir(path.join(cwd, '.tmp'), { recursive: true }));

export async function generateChangesFile(
	targetBranch: string,
	currentBranch: string,
	cwd: string,
) {
	// Validate branches exist before running git commands
	if (!branchExists(currentBranch, cwd)) {
		throw new Error(
			`Branch '${currentBranch}' does not exist in this repository. Please provide an existing branch name.`,
		);
	}

	if (!branchExists(targetBranch, cwd)) {
		throw new Error(
			`Branch '${targetBranch}' does not exist in this repository. Please provide an existing branch name.`,
		);
	}

	// Resolve branches to actual git refs (works with arbitrary branches, not just current)
	const targetRef = resolveBranchRef(targetBranch, cwd);
	const currentRef = resolveBranchRef(currentBranch, cwd);

	if (!targetRef) {
		throw new Error(
			`Unable to resolve branch '${targetBranch}' to a valid git ref.`,
		);
	}

	if (!currentRef) {
		throw new Error(
			`Unable to resolve branch '${currentBranch}' to a valid git ref.`,
		);
	}

	const commits = execSync(
		`git log ${targetRef}..${currentRef} --pretty=format:%B%n---ENDCOMMIT---`,
		{ encoding: 'utf8', cwd },
	).trim();
	const commitEntries = commits
		.split('\n---ENDCOMMIT---\n')
		.map((c) => c.trim())
		.filter(Boolean);
	const commitsTruncated = commitEntries.join('\n\n---\n\n');
	const diffSummary =
		execSync(`git diff ${targetRef}...${currentRef} --stat`, {
			encoding: 'utf8',
			cwd,
		}).trim() || 'No diff available';
	let codeDiff = '';
	try {
		codeDiff = execSync(`git diff ${targetRef}...${currentRef}`, {
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
