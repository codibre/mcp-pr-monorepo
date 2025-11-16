import * as gitUtils from '../../../src/internal/git-utils';
import { gitService } from '../../../src/internal/git-service';

describe('git-utils shim', () => {
	test('generateChangesFile delegates to gitService.generateChangesFile', async () => {
		const spy = jest
			.spyOn(gitService, 'generateChangesFile')
			.mockResolvedValue('/tmp/changes');
		const res = await gitUtils.generateChangesFile('main', 'feature');
		expect(res).toBe('/tmp/changes');
		expect(spy).toHaveBeenCalledWith('main', 'feature');
		spy.mockRestore();
	});
});
