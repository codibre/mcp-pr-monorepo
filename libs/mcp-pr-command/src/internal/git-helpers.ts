import { getErrorMessage } from './get-error-message';
import { gitService as gs } from './git-service';

/**
 *  Ensure the local target branch is in sync with remote to avoid including
 * unintended commits in the PR description. We'll try to fetch the remote
 * target branch and fast-forward the local branch when it's safe. If we
 * detect divergence that cannot be auto-resolved, return an informative
 * error asking the user to update the branch manually.
 * @param branch the branch to fetch
 * @param cwd the current working directory
 */
export async function fetchRemoteBranch(branch: string) {
	try {
		// Fetch remote target branch
		await gs.fetch(branch);
	} catch (e: unknown) {
		throw new Error(
			`Failed to fetch remote branch 'origin/${branch}': ${getErrorMessage(
				e,
			)}. Please ensure your local branch is up to date`,
		);
	}
}

export async function fastForwardBranch(local: string, remote: string) {
	await gs.fastForwardBranch(local, remote);
}

export async function revParse(ref: string) {
	return await gs.revParse(ref);
}
