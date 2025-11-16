import { GetCommitContentsTool } from '../../../src/tools/get-commit-contents.tool';
import { gitService } from '../../../src/internal/git-service';

describe('GetCommitContentsTool', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('returns changesFile when generateChangesFile succeeds', async () => {
		jest
			.spyOn(gitService, 'generateChangesFile')
			.mockResolvedValue('/tmp/changes' as any);
		const t = new GetCommitContentsTool();
		const res = await t.getCommitContents({
			cwd: process.cwd(),
			current: 'feat',
			target: 'main',
		} as any);
		expect((res as any).structuredContent.changesFile).toBe('/tmp/changes');
	});

	test('throws helpful error when generateChangesFile fails', async () => {
		jest
			.spyOn(gitService, 'generateChangesFile')
			.mockRejectedValue(new Error('boom'));
		const t = new GetCommitContentsTool();
		await expect(
			t.getCommitContents({
				cwd: process.cwd(),
				current: 'feat',
				target: 'main',
			} as any),
		).rejects.toThrow(/Failed to generate changes file: boom/);
	});
});
