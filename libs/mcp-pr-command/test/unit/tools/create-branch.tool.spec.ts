import { CreateBranchTool } from '../../../src/tools/create-branch.tool';
import { gitService } from '../../../src/internal/git-service';

describe('CreateBranchTool', () => {
	beforeEach(() => jest.restoreAllMocks());

	test('createBranchHandler throws if user did not explicitly request creation', async () => {
		const cb = new CreateBranchTool();
		await expect(
			cb.createBranchHandler({
				type: 'feat',
				suffix: 'My Feature',
				cwd: process.cwd(),
			} as any),
		).rejects.toThrow(
			'Branch creation aborted: user did not explicitly request branch creation.',
		);
	});

	test('createBranchHandler creates branch name and calls gitService when explicitly requested', async () => {
		jest.spyOn(gitService, 'tryFetch').mockResolvedValue(undefined as any);
		const checkoutSpy = jest
			.spyOn(gitService, 'checkoutBranch')
			.mockResolvedValue('ok' as any);
		const cb = new CreateBranchTool();
		const res = await cb.createBranchHandler({
			type: 'feat',
			suffix: 'My Feature',
			cwd: process.cwd(),
			userExplicitlyRequestedCreation: true,
		} as any);
		expect(res.structuredContent?.branchName).toBe('feat/my-feature');
		expect(checkoutSpy).toHaveBeenCalled();
	});
});
