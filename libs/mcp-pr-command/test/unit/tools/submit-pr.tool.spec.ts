import { SubmitPrTool } from '../../../src/tools/submit-pr.tool';
import { gitService } from '../../../src/internal/git-service';
import { ghClient } from '../../../src/internal/gh-client-instance';
import * as tempFile from '../../../src/internal/temp-file';

describe('SubmitPrTool', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('creates PR when prNumber not provided', async () => {
		jest.spyOn(gitService, 'refExists').mockResolvedValue(false as any);
		const createSpy = jest
			.spyOn(ghClient, 'prCreate')
			.mockResolvedValue('https://github.com/owner/repo/pull/123' as any);
		const ctemp = jest
			.spyOn(tempFile, 'createTempFile')
			.mockResolvedValue('/tmp/body' as any);
		const runMod = await import('src/internal/run');
		jest.spyOn(runMod, 'run').mockResolvedValue('');
		const cs = await import('src/internal');
		jest.spyOn(cs.contextService, 'cwd', 'get').mockReturnValue(process.cwd());
		// mock clearTempDir from the module that declares it (temp-file)
		jest.spyOn(tempFile, 'clearTempDir').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
		const t = new SubmitPrTool();
		const res = await t.submitPr({
			cwd: process.cwd(),
			title: 'T',
			body: 'B',
			targetBranch: 'main',
			currentBranch: 'feat',
			deleteTempDir: false,
		} as any);
		expect(createSpy).toHaveBeenCalled();
		expect(res.structuredContent?.prUrl).toContain('/pull/123');
		ctemp.mockRestore();
	});
});
