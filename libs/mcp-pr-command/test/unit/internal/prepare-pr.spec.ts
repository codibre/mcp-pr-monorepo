import { preparePr } from '../../../src/internal/prepare-pr';
import { ghClient } from '../../../src/internal/gh-client-instance';
import { gitService } from '../../../src/internal/git-service';
import * as tempFile from '../../../src/internal/temp-file';
import { contextService } from '../../../src/internal/context-service';

describe('preparePr', () => {
	const originalCwd = process.cwd();
	beforeEach(() => jest.restoreAllMocks());
	afterEach(() => process.chdir(originalCwd));

	test('happy path with no existing PR and local/remote branches present', async () => {
		jest.spyOn(ghClient, 'prList').mockResolvedValue([] as any);
		jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		jest
			.spyOn(gitService, 'generateChangesFile')
			.mockResolvedValue('/tmp/changes' as any);
		jest
			.spyOn(tempFile, 'createTempFile')
			.mockResolvedValue('/tmp/prcontent' as any);
		jest.spyOn(contextService, 'cwd', 'get').mockReturnValue(process.cwd());

		const res = (await preparePr({
			targetBranch: 'main',
			currentBranch: 'feat',
		})) as any;
		// Result uses buildTextResult: check content and structuredContent
		expect(res.content?.[0]?.text).toMatch(
			/Prepared PR artifacts successfully/,
		);
		expect(res.structuredContent?.filesToRead).toContain('/tmp/changes');
	});
});
