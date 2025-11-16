import { PreparePrTool } from 'src/tools/prepare-pr.tool';

describe('PreparePrTool', () => {
	it('registers the tool and delegates to preparePr', () => {
		const registerTool = jest.fn();
		const server: any = {};
		// mock internal functions
		const preparePr = jest.fn().mockReturnValue({ ok: true });
		const preparePrInputSchema = {} as any;
		const preparePrOutputSchema = {} as any;
		const contextService = {
			registerTool,
		} as any;

		jest.doMock('src/internal', () => ({
			contextService,
			preparePr,
			preparePrInputSchema,
			preparePrOutputSchema,
		}));

		const Cls = require('src/tools/prepare-pr.tool')
			.PreparePrTool as typeof PreparePrTool;
		const inst = new Cls();
		inst.registerTool(server);

		// ensure registerTool was called
		expect(registerTool).toHaveBeenCalled();
		// call preparePr via the registered handler to ensure delegation
		const handler = registerTool.mock.calls[0][3];
		const res = handler({ cwd: '/tmp', targetBranch: 'a', currentBranch: 'b' });
		expect(preparePr).toHaveBeenCalled();
		expect(res).toEqual({ ok: true });
	});
});
