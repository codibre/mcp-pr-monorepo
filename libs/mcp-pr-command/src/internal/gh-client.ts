import { Nullable } from 'is-this-a-pigeon';
import { run } from './run';

export type PrListItem = { number: number };

export class GhClient {
	// List PRs matching base/head
	async prList(opts: { base: string; head: string }): Promise<PrListItem[]> {
		const { base, head } = opts;
		const out = await run(
			`gh pr list --base ${base} --head ${head} --json number`,
		);
		try {
			return JSON.parse(out) as PrListItem[];
		} catch {
			return [];
		}
	}

	// View PR details, returning parsed json
	async prView(prNumber: number | string, fields: string[]) {
		const f = fields.join(',');
		const out = await run(`gh pr view ${prNumber} --json ${f}`);
		return JSON.parse(out) as Nullable<{
			title: string;
			body: string;
			url: string;
		}>;
	}

	// Edit PR
	async prEdit(prNumber: number, title: string, bodyFile: string) {
		await run(
			`gh pr edit ${prNumber} --title "${title}" --body-file "${bodyFile}"`,
		);
	}

	// Create PR; returns stdout
	async prCreate(opts: {
		base: string;
		head: string;
		title: string;
		bodyFile: string;
	}): Promise<string> {
		const { base, head, title, bodyFile } = opts;
		return await run(
			`gh pr create --base ${base} --head ${head} --title "${title}" --body-file "${bodyFile}"`,
		);
	}
}

export const ghClient = new GhClient();
