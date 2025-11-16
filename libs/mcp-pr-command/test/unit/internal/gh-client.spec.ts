import { GhClient } from '../../../src/internal/gh-client';
import * as runModule from '../../../src/internal/run';

describe('GhClient parsing', () => {
	afterEach(() => jest.restoreAllMocks());

	test('prList parses JSON output', async () => {
		const json = JSON.stringify([{ number: 123 }]);
		jest.spyOn(runModule, 'run').mockResolvedValue(json);
		const client = new GhClient();
		const list = await client.prList({ base: 'main', head: 'feat' });
		expect(list).toEqual([{ number: 123 }]);
	});

	test('prView returns parsed object', async () => {
		const obj = { title: 'T', body: 'B', url: 'U' };
		jest.spyOn(runModule, 'run').mockResolvedValue(JSON.stringify(obj));
		const client = new GhClient();
		const view = await client.prView(1, ['title', 'body']);
		expect(view).toEqual(obj);
	});
});
