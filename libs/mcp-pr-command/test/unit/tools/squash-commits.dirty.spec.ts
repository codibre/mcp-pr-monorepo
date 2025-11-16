import { SquashCommitsTool } from '../../../src/tools/squash-commits.tool';
import { gitService } from '../../../src/internal/git-service';

describe('SquashCommitsTool dirty working tree', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('throws when working tree is not clean', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		jest.spyOn(gitService, 'logRange').mockResolvedValue('h1');
		jest.spyOn(gitService, 'push').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
		jest
			.spyOn(gitService, 'statusPorcelain')
			.mockResolvedValue(' M file.txt' as any);

		const t = new SquashCommitsTool();
		await expect(
			t.squashCommits({
				cwd: process.cwd(),
				current: 'feat',
				target: 'main',
				commit: 'msg',
			} as any),
		).rejects.toThrow(/Working tree is not clean/);
	});
});
