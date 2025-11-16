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
		// also mock the barrel re-export 'run' used by the tool
		const barrel = await import('src/internal');
		jest.spyOn(barrel, 'run' as any).mockResolvedValue('');
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

	test('edits existing PR when prNumber provided', async () => {
		// avoid initiating git push logic by reporting branch not present locally
		jest.spyOn(gitService, 'refExists').mockResolvedValue(false as any);
		const viewSpy = jest.spyOn(ghClient, 'prView').mockResolvedValue({
			url: 'https://github.com/owner/repo/pull/456',
		} as any);
		const editSpy = jest
			.spyOn(ghClient, 'prEdit')
			.mockResolvedValue(undefined as any);
		const ctemp = jest
			.spyOn(tempFile, 'createTempFile')
			.mockResolvedValue('/tmp/body' as any);
		const runMod = await import('src/internal/run');
		jest.spyOn(runMod, 'run').mockResolvedValue('');
		const barrel = await import('src/internal');
		jest.spyOn(barrel, 'run' as any).mockResolvedValue('');
		const cs = barrel;
		jest.spyOn(cs.contextService, 'cwd', 'get').mockReturnValue(process.cwd());
		jest.spyOn(tempFile, 'clearTempDir').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
		const t = new SubmitPrTool();
		const res = await t.submitPr({
			cwd: process.cwd(),
			prNumber: 456,
			title: 'T',
			body: 'B',
			targetBranch: 'main',
			currentBranch: 'feat',
			deleteTempDir: false,
		} as any);
		expect(viewSpy).toHaveBeenCalledWith(456, ['url']);
		expect(editSpy).toHaveBeenCalledWith(456, 'T', '/tmp/body');
		expect(res.structuredContent?.prUrl).toContain('/pull/456');
		ctemp.mockRestore();
	});
});
