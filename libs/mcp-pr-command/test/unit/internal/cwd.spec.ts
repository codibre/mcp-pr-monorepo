import { cwdJoin } from 'src/internal/cwd';
import { contextService } from 'src/internal/context-service';

describe('cwdJoin', () => {
	beforeEach(() => jest.restoreAllMocks());

	it('joins provided parts to contextService.cwd', () => {
		// mock contextService.cwd
		jest.spyOn(contextService, 'cwd', 'get').mockReturnValue('/root/project');
		const res = cwdJoin('src', 'index.ts');
		expect(res).toBe('/root/project/src/index.ts');
	});
});
