import { UpdatePRByLinkTool } from '../../../src/tools/update-pr-by-link';
import { ghClient } from '../../../src/internal/gh-client-instance';

describe('UpdatePRByLinkTool error paths', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('throws on invalid prUrl', async () => {
		const t = new UpdatePRByLinkTool();
		await expect(
			t.updatePrByLinkHandler({
				cwd: '/cwd',
				prUrl: 'https://github.com/org/repo',
			} as any),
		).rejects.toThrow(/Invalid PR URL/);
	});

	test('throws when ghClient.prView fails', async () => {
		jest.spyOn(ghClient, 'prView').mockImplementation(() => {
			throw new Error('gh fail');
		});
		const t = new UpdatePRByLinkTool();
		await expect(
			t.updatePrByLinkHandler({
				cwd: '/cwd',
				prUrl: 'https://github.com/org/repo/pull/123',
			} as any),
		).rejects.toThrow(/Failed to fetch PR #123 details/);
	});
});
