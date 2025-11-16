import { SubmitPrTool } from '../../../src/tools/submit-pr.tool';
import { gitService } from '../../../src/internal/git-service';

describe('SubmitPrTool push failure handling', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('throws helpful error when push fails', async () => {
		// make refExists true so push logic runs
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		// mock run to throw
		const runMod = await import('src/internal/run');
		jest.spyOn(runMod, 'run').mockRejectedValue(new Error('push failed'));
		// ensure barrel run is mocked as well
		const barrel = await import('src/internal');
		jest
			.spyOn(barrel, 'run' as any)
			.mockRejectedValue(new Error('push failed'));

		const t = new SubmitPrTool();
		await expect(
			t.submitPr({
				cwd: process.cwd(),
				title: 'T',
				body: 'B',
				targetBranch: 'main',
				currentBranch: 'feat',
			} as any),
		).rejects.toThrow(/Failed to push branch 'feat' to origin/);
	});
});
