import { Nullable } from 'is-this-a-pigeon';
import { Octokit } from '@octokit/rest';
import { GhClient } from './gh-client';

export type PrListItem = { number: number };

export class GhApiClient implements GhClient {
	private octokit: Octokit;

	constructor(token: string, baseUrl?: string) {
		const optsRecord: Record<string, unknown> = { auth: token };
		if (baseUrl) optsRecord.baseUrl = baseUrl;
		const opts = optsRecord as unknown as ConstructorParameters<
			typeof Octokit
		>[0];
		this.octokit = new Octokit(opts);
	}

	// List PRs matching base/head (best-effort without owner/repo)
	async prList(opts: { base: string; head: string }): Promise<PrListItem[]> {
		const { base, head } = opts;
		const q = `is:pr base:${base} head:${head}`;
		const res = await this.octokit.rest.search.issuesAndPullRequests({ q });
		const items = res.data.items ?? [];
		return items.map((i) => ({ number: i.number }));
	}

	// View PR details, returning parsed json
	async prView(_prNumber: number | string, _fields: string[]) {
		const number =
			typeof _prNumber === 'string' ? parseInt(_prNumber, 10) : _prNumber;
		const q = `type:pr ${number}`;
		const res = await this.octokit.rest.search.issuesAndPullRequests({ q });
		const item = (res.data.items && res.data.items[0]) ?? null;
		if (!item) {
			return null as Nullable<{ title: string; body: string; url: string }>;
		}
		const title = item.title;
		const body = item.body ?? '';
		const url = item.html_url ?? '';
		const result: Nullable<{ title: string; body: string; url: string }> = {
			title,
			body,
			url,
		};
		return result;
	}

	// Edit PR
	async prEdit(prNumber: number, title: string, bodyFile: string) {
		const fs = await import('fs');
		const body = fs.readFileSync(bodyFile, 'utf8');
		const q = `type:pr ${prNumber}`;
		const res = await this.octokit.rest.search.issuesAndPullRequests({ q });
		const item = (res.data.items && res.data.items[0]) ?? null;
		if (!item) throw new Error('PR not found');
		const apiUrl = (item.pull_request && item.pull_request.url) ?? '';
		if (!apiUrl) throw new Error('PR api url not found');
		const m = apiUrl.match(/repos\/([^\/]+)\/([^\/]+)\/pulls\/\d+/);
		if (!m) throw new Error('Could not parse repo from PR url');
		const owner = m[1] as string;
		const repo = m[2] as string;
		await this.octokit.rest.pulls.update({
			owner,
			repo,
			pull_number: prNumber,
			title,
			body,
		});
	}

	// Create PR; returns stdout-like string
	async prCreate(_opts: {
		base: string;
		head: string;
		title: string;
		bodyFile: string;
	}): Promise<string> {
		throw new Error(
			'prCreate via API requires owner/repo context; please run from repository or fall back to gh CLI',
		);
	}
}

export const ghApiClient = GhApiClient;
