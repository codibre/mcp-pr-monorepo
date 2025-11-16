import { getErrorMessage } from 'src/internal/get-error-message';

describe('getErrorMessage', () => {
	it('returns message for Error', () => {
		const err = new Error('boom');
		expect(getErrorMessage(err)).toBe('boom');
	});

	it('stringifies non-Error values', () => {
		expect(getErrorMessage('hello')).toBe('hello');
		expect(getErrorMessage(123)).toBe('123');
		expect(getErrorMessage({ a: 1 })).toBe('[object Object]');
	});
});
