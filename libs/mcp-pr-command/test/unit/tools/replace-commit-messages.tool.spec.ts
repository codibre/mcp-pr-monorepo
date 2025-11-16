import { ReplaceCommitMessagesTool } from '../../../src/tools/replace-commit-messages.tool';
import { gitService } from '../../../src/internal/git-service';

describe('ReplaceCommitMessagesTool', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('throws when counts mismatch', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		// return two hashes but provide only one new message -> mismatch
		jest
			.spyOn(gitService, 'logRange')
			.mockResolvedValue('h1\n---END---\nh2\n---END---\n' as any);
		const t = new ReplaceCommitMessagesTool();
		await expect(
			t.replaceCommitMessages({
				cwd: process.cwd(),
				current: 'feat',
				target: 'main',
				commits: ['only one'],
			} as any),
		).rejects.toThrow(/Commit count mismatch/);
	});
});
