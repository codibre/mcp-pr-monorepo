import { ReplaceCommitMessagesTool } from '../../../src/tools/replace-commit-messages.tool';
import { gitService } from '../../../src/internal/git-service';
import * as tempFile from '../../../src/internal/temp-file';
import fs from 'fs/promises';

describe('ReplaceCommitMessagesTool happy path', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('rewrites mapping and returns replaced count', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		// two commits between branches
		jest
			.spyOn(gitService, 'logRange')
			.mockResolvedValue('h1\n---END---\nh2\n---END---\n' as any);
		// push/fetch/checkout no-op
		jest.spyOn(gitService, 'push').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
		jest
			.spyOn(gitService, 'checkoutBranch')
			.mockResolvedValue(undefined as any);
		// showCommitBody returns different messages to force mapping
		jest
			.spyOn(gitService, 'showCommitBody')
			.mockImplementation(async (h: string) => {
				return h === 'h1' ? 'old-one' : 'old-two';
			});
		jest
			.spyOn(gitService, 'filterBranchMsgFilter')
			.mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'revParseHead').mockResolvedValue('newhead' as any);
		jest
			.spyOn(gitService, 'branchForceUpdate')
			.mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'deleteBranch').mockResolvedValue(undefined as any);

		jest
			.spyOn(tempFile, 'createSystemTempFile')
			.mockResolvedValueOnce('/tmp/mapping.json' as any);
		jest
			.spyOn(tempFile, 'createSystemTempFile')
			.mockResolvedValueOnce('/tmp/filter.sh' as any);
		jest.spyOn(fs, 'chmod').mockResolvedValue(undefined as any);
		jest.spyOn(fs, 'unlink').mockResolvedValue(undefined as any);
		jest.spyOn(fs, 'rm').mockResolvedValue(undefined as any);

		const t = new ReplaceCommitMessagesTool();
		const res = await t.replaceCommitMessages({
			cwd: process.cwd(),
			current: 'feat',
			target: 'main',
			commits: ['new-one', 'new-two'],
		} as any);

		expect((res as any).structuredContent.replaced).toBe(2);
	});
});
