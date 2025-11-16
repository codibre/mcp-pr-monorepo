import { GhClient } from '../../../src/internal/gh-client';
import * as runModule from '../../../src/internal/run';

describe('GhClient', () => {
	afterEach(() => jest.restoreAllMocks());

	test('prList returns empty on invalid json', async () => {
		jest.spyOn(runModule, 'run').mockResolvedValue('not-json');
		const client = new GhClient();
		const res = await client.prList({ base: 'b', head: 'h' });
		expect(res).toEqual([]);
	});

	test('prList parses json', async () => {
		jest
			.spyOn(runModule, 'run')
			.mockResolvedValue(JSON.stringify([{ number: 1 }]));
		const client = new GhClient();
		const res = await client.prList({ base: 'b', head: 'h' });
		expect(res).toEqual([{ number: 1 }]);
	});

	test('prView parses json and returns object', async () => {
		jest
			.spyOn(runModule, 'run')
			.mockResolvedValue(JSON.stringify({ url: 'u', title: 'T' }));
		const client = new GhClient();
		const res = await client.prView(1, ['url', 'title']);
		expect(res).toEqual({ url: 'u', title: 'T' });
	});

	test('prEdit and prCreate call run', async () => {
		const runSpy = jest.spyOn(runModule, 'run').mockResolvedValue('ok');
		const client = new GhClient();
		await client.prEdit(1, 't', '/tmp/body');
		const out = await client.prCreate({
			base: 'b',
			head: 'h',
			title: 't',
			bodyFile: '/tmp/body',
		});
		expect(runSpy).toHaveBeenCalled();
		expect(out).toBe('ok');
	});
});
