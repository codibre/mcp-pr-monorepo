import { run, command } from './run';
import { attempt } from './attempt';
import { assertDefined } from 'is-this-a-pigeon';
import { getErrorMessage } from './get-error-message';

export type LocalType = 'local' | 'remote';

// module-local helper that returns a CommandBuilder pre-seeded with 'git'
function git() {
	return command('git');
}

function prepareBranchName(branchName: string, branchLocal?: LocalType) {
	if (branchLocal === 'remote') branchName = `origin/${branchName}`;
	return branchName;
}

export class GitService {
	// --- public API (use helpers above) ----------------------------------
	async revParseAbbrevRef(): Promise<string> {
		return await git().with('rev-parse', '--abbrev-ref', 'HEAD').run();
	}

	async listBranches(): Promise<string[]> {
		const out = await git().with('branch').run();
		return out
			.split('\n')
			.map((b: string) => b.trim().replace(/^\* /, ''))
			.filter(Boolean);
	}

	async mergeBase(a: string, b: string): Promise<string> {
		return await git().with('merge-base', a, b).run();
	}

	async revListCountBetween(base: string, head: string): Promise<number> {
		const s = await git().with('rev-list', '--count', `${base}..${head}`).run();
		return parseInt(s || '0', 10);
	}

	// return raw git log output for a range.
	// format: 'messages' => full commit messages (subject+body) separated by ---ENDCOMMIT---
	//         'hashes'   => hashes separated by ---END---
	//         'content'  => full pretty format raw output (user supplied fmt) — behaves like 'messages' for now
	async logRange(
		target: string,
		current: string,
		opts?: {
			format?: 'messages' | 'hashes' | 'content';
			targetLocal?: LocalType;
			currentLocal?: LocalType;
		},
	): Promise<string> {
		target = prepareBranchName(target, opts?.targetLocal);
		current = prepareBranchName(current, opts?.currentLocal);
		const range = `${target}..${current}`;
		const formatMode = opts?.format ?? 'messages';
		// choose pretty format string based on requested mode
		const pretty =
			formatMode === 'hashes' ? '%H%n---END---' : '%B%n---ENDCOMMIT---';
		const cmd = git().with('log', range).with(`--pretty=format:${pretty}`);
		return await cmd.run();
	}

	async symbolicRefQuiet(ref: string): Promise<string> {
		return await git().with('symbolic-ref', '--quiet', ref).run();
	}

	async fetch(ref: string) {
		try {
			return await git().with('fetch', 'origin').ifWith(ref, ref).run();
		} catch (e: unknown) {
			throw new Error(
				`Failed to fetch remote branch 'origin/${ref}': ${getErrorMessage(
					e,
				)}. Please ensure your local branch is up to date`,
			);
		}
	}

	async tryFetch(...ref: string[]) {
		for (const r of ref) await attempt(async () => await this.fetch(r));
	}

	async createTag(tag: string) {
		return await git().with('tag', tag).run();
	}

	/**
	 * Verify a ref quietly. By default this checks local refs (refs/heads/...).
	 * If opts.where === 'remote' the method will check the given remote for the
	 * branch using `git ls-remote --heads` (remote defaults to 'origin').
	 *
	 * The `ref` parameter may be:
	 * - a full refname (e.g. 'refs/heads/main') — used as-is for local checks
	 * - a branch name (e.g. 'main') — mounted to 'refs/heads/<name>' for local checks
	 * - a branch name when checking remote (e.g. 'main') — used with ls-remote
	 */
	async showRefVerifyQuiet(
		ref: string,
		opts?: { where?: LocalType; remote?: string },
	) {
		if (opts?.where === 'remote') {
			const localToCheck = opts.remote ?? 'origin';
			// Use ls-remote to check the remote for the branch. This command prints
			// an empty string when not found, and a line with the hash when found.
			const out = await git()
				.with('ls-remote', '--heads', localToCheck, ref)
				.run();
			assertDefined(out, `remote ref '${ref}' not found on ${localToCheck}`);
			return out;
		}

		// local check: accept full refnames or mount short branch names to refs/heads
		const checkRef = /^refs\//.test(ref) ? ref : `refs/heads/${ref}`;
		return await git().with('show-ref', '--verify', '--quiet', checkRef).run();
	}

	async lsRemoteHeads(origin: string, branch: string) {
		return await git().with('ls-remote', '--heads', origin, branch).run();
	}

	/**
	 * Non-throwing helper that checks if a ref exists locally (true) or not.
	 */
	async refExists(
		ref: string,
		opts?: { where?: LocalType | 'any'; remote?: string },
	): Promise<boolean> {
		const wheres =
			opts?.where === 'any'
				? (['local', 'remote'] as const)
				: [opts?.where ?? 'local'];
		for (const where of wheres) {
			try {
				await this.showRefVerifyQuiet(ref, { where, remote: opts?.remote });
				return true;
			} catch {
				continue;
			}
		}
		return false;
	}

	/**
	 * Check whether a remote has the given branch head.
	 */
	async hasRemoteHead(origin: string, branch: string): Promise<boolean> {
		try {
			const out = await this.lsRemoteHeads(origin, branch);
			return !!out;
		} catch {
			return false;
		}
	}

	// unified diff API: pass opts.stat = true to get --stat output
	async diff(
		targetRef: string,
		currentRef: string,
		opts?: {
			stat?: boolean;
			targetLocal?: LocalType;
			currentLocal?: LocalType;
		},
	): Promise<string> {
		targetRef = prepareBranchName(targetRef, opts?.targetLocal);
		currentRef = prepareBranchName(currentRef, opts?.currentLocal);
		const range = `${targetRef}...${currentRef}`;
		const cmd = git().with('diff', range).ifWith(opts?.stat, '--stat');
		return await cmd.run();
	}

	async createLocalBranchFromRemote(
		local: string,
		remote: string,
		opts?: { remote?: string },
	) {
		try {
			// The service expects callers to pass the short branch name (no prefixes).
			// Always construct the remote ref using opts.remote (default: origin).
			const remoteName = opts?.remote ?? 'origin';
			const remoteRef = `${remoteName}/${remote}`;
			return await git().with('branch', local, remoteRef).run();
		} catch (e: unknown) {
			throw new Error(
				`Failed to create local branch '${local}' from '${remote}': ${getErrorMessage(
					e,
				)}. Please create/update the branch manually.`,
			);
		}
	}

	async fastForwardBranch(local: string, remote: string) {
		// delegate to branchForceUpdate to avoid duplicated git command strings
		return await this.branchForceUpdate(local, remote);
	}

	async revParse(ref: string) {
		return await git().with('rev-parse', ref).run();
	}

	/**
	 * Checkout a branch. To create a new branch, pass opts.new = true and optional startPoint.
	 */
	async checkoutBranch(
		branch: string,
		opts?: { new?: boolean; startPoint?: string },
	) {
		if (opts?.new) {
			const startPoint = opts.startPoint;
			if (startPoint) {
				return await git()
					.with('checkout', '-b', branch)
					.with(startPoint)
					.run();
			}
			return await git().with('checkout', '-b', branch).run();
		}
		return await git().with('checkout', branch).run();
	}

	/**
	 * Unified reset API. Defaults to hard reset when no mode provided.
	 * - mode: 'hard' | 'soft'
	 * - ref: optional ref used for soft reset (e.g., base ref)
	 */
	async reset(opts?: { mode?: 'hard' | 'soft'; ref?: string }) {
		const mode = opts?.mode ?? 'hard';
		if (mode === 'soft') {
			return await git()
				.with('reset', '--soft', opts?.ref ?? 'HEAD')
				.run();
		}
		// For hard reset, allow resetting to a specific ref when provided
		if (opts?.ref) {
			return await git().with('reset', '--hard', opts.ref).run();
		}
		return await git().with('reset', '--hard').run();
	}

	/**
	 * Create a commit. `opts` is required. Provide either `opts.msgFile` or `opts.msg`.
	 * `opts.amend` will perform --amend.
	 */
	async commit(opts: { msgFile?: string; msg?: string; amend?: boolean }) {
		return await git()
			.with('commit')
			.ifWith(opts.amend, '--amend')
			.ifWith(opts.msgFile, '-F', `"${opts.msgFile}"`)
			.ifWith(!opts.msgFile && opts.msg, '-m', `"${opts.msg}"`)
			.run();
	}

	async deleteBranch(branch: string) {
		return await git().with('branch', '-D', branch).run();
	}

	async deleteTag(tag: string) {
		return await git().with('tag', '-d', tag).run();
	}

	async showCommitBody(hash: string): Promise<string> {
		const out = await git().with('show', '-s', '--format=%B', hash).run();
		return out.replace(/\r\n/g, '\n').trim();
	}

	async revParseHead(): Promise<string> {
		return await this.revParse('HEAD');
	}

	async branchForceUpdate(branch: string, newRef: string) {
		return await git().with('branch', '-f', branch, newRef).run();
	}

	/**
	 * Remove untracked files and directories (git clean -fd).
	 */
	async clean() {
		return await run('git clean -fd');
	}

	/**
	 * Return porcelain status output (empty string when clean).
	 */
	async statusPorcelain(): Promise<string> {
		return await run('git status --porcelain');
	}

	/**
	 * Unified push API. Use opts.force to push --force.
	 */
	async push(remote: string, branch: string, opts?: { force?: boolean }) {
		const cmd = git()
			.with('push')
			.ifWith(opts?.force, '--force')
			.with(remote)
			.with(branch);
		return await cmd.run();
	}

	// Accepts base and head components and constructs the range internally.
	async filterBranchMsgFilter(
		base: string,
		head: string,
		filterScriptPath: string,
	) {
		const range = `${base}..${head}`;
		const cmd = git()
			.with('filter-branch')
			.with('-f')
			.with('--msg-filter', `"${filterScriptPath}"`)
			.with(range);
		return await run(cmd.toString());
	}
}

export const gitService = new GitService();
