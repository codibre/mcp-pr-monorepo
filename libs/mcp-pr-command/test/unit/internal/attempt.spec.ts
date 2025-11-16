import { attempt, attemptCB } from 'src/internal';

describe('attempt', () => {
	// Arrange //
	const syncSuccess = () => 42;
	const syncError = () => {
		throw new Error('fail');
	};
	const asyncSuccess = async () => 99;
	const asyncError = async () => {
		throw new Error('async fail');
	};

	// Act & Assert //
	it('should return value for sync success', () => {
		// Act
		const result = attempt(syncSuccess);
		// Assert
		expect(result).toBe(42);
	});

	it('should call catchCb for sync error', () => {
		// Arrange
		const catchCb = jest.fn().mockReturnValue('caught');
		// Act
		const result = attempt(syncError, catchCb);
		// Assert
		expect(result).toBe('caught');
		expect(catchCb).toHaveBeenCalledWith(expect.any(Error));
	});

	it('should return promise value for async success', async () => {
		// Act
		const result = attempt(asyncSuccess);
		// Assert
		await expect(result).resolves.toBe(99);
	});

	it('should call catchCb for async error', async () => {
		// Arrange
		const catchCb = jest.fn().mockReturnValue('async caught');
		// Act
		const result = attempt(asyncError, catchCb);
		// Assert
		await expect(result).resolves.toBe('async caught');
		expect(catchCb).toHaveBeenCalledWith(expect.any(Error));
	});
});

describe('attemptCB', () => {
	// Arrange //
	const add = (a: number, b: number) => a + b;
	const fail = () => {
		throw new Error('fail');
	};
	const asyncAdd = async (a: number, b: number) => a + b;
	const asyncFail = async () => {
		throw new Error('async fail');
	};

	it('should wrap sync function and return result', () => {
		// Act
		const wrapped = attemptCB(add);
		// Assert
		expect(wrapped(2, 3)).toBe(5);
	});

	it('should wrap sync function and call catchCb on error', () => {
		// Arrange
		const catchCb = jest.fn().mockReturnValue('caught');
		const wrapped = attemptCB(fail, catchCb);
		// Act
		const result = wrapped();
		// Assert
		expect(result).toBe('caught');
		expect(catchCb).toHaveBeenCalledWith(expect.any(Error));
	});

	it('should wrap async function and return promise result', async () => {
		// Act
		const wrapped = attemptCB(asyncAdd);
		// Assert
		await expect(wrapped(4, 5)).resolves.toBe(9);
	});

	it('should wrap async function and call catchCb on error', async () => {
		// Arrange
		const catchCb = jest.fn().mockReturnValue('async caught');
		const wrapped = attemptCB(asyncFail, catchCb);
		// Act
		const result = wrapped();
		// Assert
		await expect(result).resolves.toBe('async caught');
		expect(catchCb).toHaveBeenCalledWith(expect.any(Error));
	});
});
