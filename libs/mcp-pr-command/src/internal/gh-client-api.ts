import { Nullable } from 'is-this-a-pigeon';
import { Octokit } from '@octokit/rest';
import { GhClient, PrListItem } from './gh-client';
import { run } from './run';

// Minimal typing for search items we consume from the Search API
type SearchItem = {
	title?: string;
	body?: string | null;
	html_url?: string | null;
	pull_request?: { url?: string } | null;
};

export class GhApiClient implements GhClient {
	private octokit: Octokit | undefined;
	private async getOctokit(): Promise<Octokit> {
		if (!this.octokit) {
			const token = await run('gh auth token');
			this.octokit = new Octokit({ auth: token });
		}
		return this.octokit;
	}

	/**
	 * Try to derive owner/repo from git remotes in the local repository.
	 * Returns null when no remote information is available.
	 */
	private async getOwnerRepoFromGit(): Promise<Nullable<{ owner: string; repo: string }>> {
		const candidates = [
			'git remote get-url origin',
			'git config --get remote.origin.url',
			'git remote -v',
		];
		for (const cmd of candidates) {
			try {
				const out = await run(cmd);
				if (!out) continue;
				// try to find a github owner/repo in the output
				const m = out
					.trim()
					.match(/(?:git@|https?:\/\/)?[^\/:]+[:\/]([^\/:]+)\/([^\/.\s]+)(?:\.git)?/);
				if (m) {
					return { owner: String(m[1]), repo: String(m[2]) };
				}
			} catch {
				continue;
			}
		}
		return null;
	}

	private async resolveOwnerRepoOrThrow() {
		const v = await this.getOwnerRepoFromGit();
		if (!v) throw new Error('Could not determine owner/repo from git remotes');
		return v;
	}

	// Helper to call search endpoints when owner/repo cannot be derived.
	private async searchIssueByNumber(number: number) {
		const client = await this.getOctokit();
		const q = `type:pr ${number}`;
		const res = await client.request('GET /search/issues', { q });
		return (res.data as { items?: SearchItem[] }).items?.[0] ?? null;
	}

	// List PRs matching base/head (best-effort without owner/repo)
	async prList(opts: { base: string; head: string }): Promise<PrListItem[]> {
		const { base, head } = opts;
		// prefer repository-scoped API when we can determine owner/repo
		const or = await this.getOwnerRepoFromGit();
		const client = await this.getOctokit();
		if (or) {
			try {
				const res = await client.rest.pulls.list({
					owner: or.owner,
					repo: or.repo,
					base,
					head,
				});
				const data = res.data ?? [];
				return data.map((d) => ({ number: d.number }));
			} catch {
				// fallthrough to search
			}
		}
		const q = `is:pr base:${base} head:${head}`;
		const res = await client.request('GET /search/issues', { q });
		const data = res.data as { items?: Array<{ number?: number }> };
		const items = data.items ?? [];
		return items
			.filter((i): i is { number: number } => typeof i.number === 'number')
			.map((i) => ({ number: i.number }));
	}

	// View PR details, returning parsed json
	async prView(_prNumber: number | string, _fields: string[]) {
		const number = typeof _prNumber === 'string' ? parseInt(_prNumber, 10) : _prNumber;
		const client = await this.getOctokit();
		const or = await this.getOwnerRepoFromGit();
		if (or) {
			try {
				const res = await client.rest.pulls.get({ owner: or.owner, repo: or.repo, pull_number: number });
				return { title: res.data.title ?? '', body: res.data.body ?? '', url: res.data.html_url ?? '' };
			} catch {
				// fallthrough to search
			}
		}
		const item = await this.searchIssueByNumber(number);
		if (!item) return null as Nullable<{ title: string; body: string; url: string }>;
		return { title: item.title ?? '', body: item.body ?? '', url: item.html_url ?? '' };
	}

	// Edit PR
	async prEdit(prNumber: number, title: string, bodyFile: string) {
		const fs = await import('fs');
		const body = fs.readFileSync(bodyFile, 'utf8');
		const client = await this.getOctokit();
		const or = await this.getOwnerRepoFromGit();
		if (!or) {
			// try to discover via search and then call the REST update
			const item = await this.searchIssueByNumber(prNumber);
			if (!item) throw new Error('PR not found');
			const apiUrl = (item.pull_request && item.pull_request.url) ?? '';
			if (!apiUrl) throw new Error('PR api url not found');
			const m = apiUrl.match(/repos\/([^\/]+)\/([^\/]+)\/pulls\/(\d+)/);
			if (!m) throw new Error('Could not parse repo from PR url');
			const owner = m[1] as string;
			const repo = m[2] as string;
			await client.rest.pulls.update({ owner, repo, pull_number: prNumber, title, body });
			return;
		}
		await client.rest.pulls.update({ owner: or.owner, repo: or.repo, pull_number: prNumber, title, body });
	}

	// Create PR; returns stdout-like string
	async prCreate(opts: {
		base: string;
		head: string;
		title: string;
		bodyFile: string;
	}): Promise<string> {
		const fs = await import('fs');
		const body = fs.readFileSync(opts.bodyFile, 'utf8');
		const client = await this.getOctokit();
		const or = await this.resolveOwnerRepoOrThrow();
		const res = await client.rest.pulls.create({
			owner: or.owner,
			repo: or.repo,
			base: opts.base,
			head: opts.head,
			title: opts.title,
			body,
		});
		// return the PR web url
		return res.data.html_url ?? '';
	}
}
