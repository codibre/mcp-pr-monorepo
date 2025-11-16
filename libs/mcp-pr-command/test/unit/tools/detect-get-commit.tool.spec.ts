import { DetectBranchesTool } from '../../../src/tools/detect-branches.tool';
import { GetCommitMessagesTool } from '../../../src/tools/get-commit-messages.tool';
import { GetCommitContentsTool } from '../../../src/tools/get-commit-contents.tool';
import { gitService } from '../../../src/internal/git-service';
import * as pathUtils from '../../../src/internal/path-utils';

describe('Tools - detect and commits', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('DetectBranchesTool suggests target based on closest branch', async () => {
		jest.spyOn(pathUtils, 'normalizePath').mockResolvedValue('/repo');
		jest
			.spyOn(gitService, 'revParseAbbrevRef')
			.mockResolvedValue('feature/abc' as any);
		jest
			.spyOn(gitService, 'listBranches')
			.mockResolvedValue(['main', 'staging', 'release'] as any);
		jest.spyOn(gitService, 'mergeBase').mockResolvedValue('basehash' as any);
		jest.spyOn(gitService, 'revListCountBetween').mockResolvedValue(1 as any);
		const t = new DetectBranchesTool();
		const res = await t.detectBranches({ cwd: process.cwd() } as any);
		expect(res.structuredContent?.suggestedTarget).toBeDefined();
	});

	test('GetCommitMessagesTool returns parsed messages', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		const sample = 'Subject\nBody\n---ENDCOMMIT---\n';
		jest.spyOn(gitService, 'logRange').mockResolvedValue(sample as any);
		const t = new GetCommitMessagesTool();
		const res = await t.getCommitMessages({
			cwd: process.cwd(),
			current: 'feat',
			target: 'main',
		} as any);
		expect(res.structuredContent?.commits?.length).toBeGreaterThanOrEqual(1);
	});

	test('GetCommitContentsTool returns changes file path', async () => {
		jest
			.spyOn(gitService, 'generateChangesFile')
			.mockResolvedValue('/tmp/changes' as any);
		const t = new GetCommitContentsTool();
		const res = await t.getCommitContents({
			cwd: process.cwd(),
			current: 'feat',
			target: 'main',
		} as any);
		expect(res.structuredContent?.changesFile).toBe('/tmp/changes');
	});
});
