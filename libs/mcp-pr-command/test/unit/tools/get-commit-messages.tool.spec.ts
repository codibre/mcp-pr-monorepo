import { GetCommitMessagesTool } from '../../../src/tools/get-commit-messages.tool';
import { gitService } from '../../../src/internal/git-service';

describe('GetCommitMessagesTool', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('throws when branches missing', async () => {
		const t = new GetCommitMessagesTool();
		await expect(
			t.getCommitMessages({
				cwd: process.cwd(),
				current: '',
				target: '',
			} as any),
		).rejects.toThrow();
	});

	test('throws when branches do not exist', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(false as any);
		const t = new GetCommitMessagesTool();
		await expect(
			t.getCommitMessages({
				cwd: process.cwd(),
				current: 'feat',
				target: 'main',
			} as any),
		).rejects.toThrow(/One or both of the specified branches do not exist/);
	});

	test('throws when git log errors', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		jest
			.spyOn(gitService, 'logRange')
			.mockRejectedValue(new Error('gitlogfail'));
		const t = new GetCommitMessagesTool();
		await expect(
			t.getCommitMessages({
				cwd: process.cwd(),
				current: 'feat',
				target: 'main',
			} as any),
		).rejects.toThrow(/Failed to get git log: gitlogfail/);
	});

	test('returns empty commits when no output', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		jest.spyOn(gitService, 'logRange').mockResolvedValue('');
		const t = new GetCommitMessagesTool();
		const res = await t.getCommitMessages({
			cwd: process.cwd(),
			current: 'feat',
			target: 'main',
		} as any);
		expect((res as any).structuredContent.commits).toEqual([]);
	});

	test('parses commit messages correctly', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		const out = 'Subject1\nBody1\n---ENDCOMMIT---\nSubject2\n---ENDCOMMIT---\n';
		jest.spyOn(gitService, 'logRange').mockResolvedValue(out as any);
		const t = new GetCommitMessagesTool();
		const res = await t.getCommitMessages({
			cwd: process.cwd(),
			current: 'feat',
			target: 'main',
		} as any);
		expect((res as any).structuredContent.commits.length).toBe(2);
		expect((res as any).structuredContent.commits[0]).toContain('Subject1');
	});
});
