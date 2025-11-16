import { CreateBranchTool } from '../../../src/tools/create-branch.tool';
import { gitService } from '../../../src/internal/git-service';

describe('CreateBranchTool', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('createBranchHandler creates branch name and calls gitService', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		const checkoutSpy = jest
			.spyOn(gitService, 'checkoutBranch')
			.mockResolvedValue('ok' as any);
		const cb = new CreateBranchTool();
		const res = await cb.createBranchHandler({
			type: 'feat',
			suffix: 'My Feature',
			cwd: process.cwd(),
		} as any);
		expect(res.structuredContent?.branchName).toBe('feat/my-feature');
		expect(checkoutSpy).toHaveBeenCalled();
	});
});
