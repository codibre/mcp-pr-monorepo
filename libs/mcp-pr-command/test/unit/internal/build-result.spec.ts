import { buildTextResult } from 'src/internal/build-result';

describe('buildTextResult', () => {
	it('builds a text result with optional structured content', () => {
		const res = buildTextResult('hello');
		expect(res).toHaveProperty('content');
		expect(res.content[0]).toEqual({ type: 'text', text: 'hello' });

		const structured = { foo: 'bar' } as any;
		const res2 = buildTextResult('hi', structured);
		expect(res2.structuredContent).toBe(structured);
	});
});
