import { inferCardLinkFromBranch } from 'src/internal/card-link-utils';
import { context } from 'src/internal';

describe('card-link-utils', () => {
	afterEach(() => {
		// reset context to defaults
		delete context.branchCardIdExtractPattern;
		delete context.prLinkInferPattern;
	});

	it('returns undefined when branch or patterns are missing', () => {
		expect(inferCardLinkFromBranch('feature/123')).toBeUndefined();
		expect(inferCardLinkFromBranch()).toBeUndefined();
	});

	it('infers link when pattern matches and produces different string', () => {
		context.branchCardIdExtractPattern = /.*\/(\d+)$/;
		context.prLinkInferPattern = 'https://tracker/$1';
		const out = inferCardLinkFromBranch('feat/123');
		expect(out).toBe('https://tracker/123');
	});

	it('returns undefined when replacement equals original branch (no match)', () => {
		context.branchCardIdExtractPattern = /(\d+)/;
		context.prLinkInferPattern = 'https://t/$1';
		// branch doesn't contain digits, replace will return same string
		expect(inferCardLinkFromBranch('feature/abc')).toBeUndefined();
	});

	it('does not infer when branch looks like ISO date', () => {
		context.branchCardIdExtractPattern = /.*\/(\d{4}-\d{2}-\d{2}).*/;
		context.prLinkInferPattern = 'https://tracker/$1';
		const branch = 'feat/2025-12-01-some-change';
		// inferCardLinkFromBranch should avoid inferring when branch looks like a date
		expect(inferCardLinkFromBranch(branch)).toBeUndefined();
	});
});
