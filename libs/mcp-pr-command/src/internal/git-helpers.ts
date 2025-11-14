import { execSync } from 'child_process';
import { getErrorMessage } from './get-error-message';

export function refExists(ref: string, cwd: string): boolean {
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

/**
 *  Ensure the local target branch is in sync with remote to avoid including
 * unintended commits in the PR description. We'll try to fetch the remote
 * target branch and fast-forward the local branch when it's safe. If we
 * detect divergence that cannot be auto-resolved, return an informative
 * error asking the user to update the branch manually.
 * @param branch the branch to fetch
 * @param cwd the current working directory
 */
export function fetchRemoteBranch(branch: string, cwd: string) {
	try {
		// Fetch remote target branch
		execSync(`git fetch origin ${branch}`, { encoding: 'utf8', cwd });
	} catch (e: unknown) {
		throw new Error(
			`Failed to fetch remote branch 'origin/${branch}': ${getErrorMessage(
				e,
			)}. Please ensure your local branch is up to date`,
		);
	}
}

/**
 * Create a local branch from a remote branch
 * @param local The local branch name
 * @param remote The remote branch name
 * @param cwd The current working directory
 */
export function createLocalBranchFromRemote(
	local: string,
	remote: string,
	cwd: string,
) {
	try {
		execSync(`git branch ${local} ${remote}`, { encoding: 'utf8', cwd });
	} catch (e: unknown) {
		throw new Error(
			`Failed to create local branch '${local}' from '${remote}': ${getErrorMessage(
				e,
			)}. Please create/update the branch manually.`,
		);
	}
}

export function fastForwardBranch(local: string, remote: string, cwd: string) {
	execSync(`git branch -f ${local} ${remote}`, { encoding: 'utf8', cwd });
}

export function revParse(ref: string, cwd: string) {
	return execSync(`git rev-parse ${ref}`, { encoding: 'utf8', cwd })
		.toString()
		.trim();
}
