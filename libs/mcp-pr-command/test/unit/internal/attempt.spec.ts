import { attempt, attemptCB } from 'src/internal/attempt';

describe('attempt (utils)', () => {
	it('returns value for sync success', () => {
		const result = attempt(() => 42);
		expect(result).toBe(42);
	});

	it('calls catchCb for sync error', () => {
		const catchCb = jest.fn().mockReturnValue('caught');
		const result = attempt(() => {
			throw new Error('fail');
		}, catchCb);
		expect(result).toBe('caught');
		expect(catchCb).toHaveBeenCalledWith(expect.any(Error));
	});

	it('returns promise value for async success', async () => {
		const result = attempt(async () => 99);
		await expect(result).resolves.toBe(99);
	});

	it('calls catchCb for async error', async () => {
		const catchCb = jest.fn().mockReturnValue('async caught');
		const result = attempt(async () => {
			throw new Error('async fail');
		}, catchCb);
		await expect(result).resolves.toBe('async caught');
		expect(catchCb).toHaveBeenCalledWith(expect.any(Error));
	});
});

describe('attemptCB', () => {
	it('wraps sync function and returns result', () => {
		const add = (a: number, b: number) => a + b;
		const wrapped = attemptCB(add);
		expect(wrapped(2, 3)).toBe(5);
	});

	it('wraps sync function and calls catchCb on error', () => {
		const catchCb = jest.fn().mockReturnValue('caught');
		const wrapped = attemptCB(() => {
			throw new Error('fail');
		}, catchCb);
		const res = wrapped();
		expect(res).toBe('caught');
		expect(catchCb).toHaveBeenCalledWith(expect.any(Error));
	});

	it('wraps async function and returns promise result', async () => {
		const wrapped = attemptCB(async (a: number, b: number) => a + b);
		await expect(wrapped(4, 5)).resolves.toBe(9);
	});

	it('wraps async function and calls catchCb on error', async () => {
		const catchCb = jest.fn().mockReturnValue('async caught');
		const wrapped = attemptCB(async () => {
			throw new Error('async fail');
		}, catchCb);
		const res = wrapped();
		await expect(res).resolves.toBe('async caught');
		expect(catchCb).toHaveBeenCalledWith(expect.any(Error));
	});
});
