import { log } from '../../../src/internal/log';

describe('log', () => {
	it('should call console.error with the correct prefix and message', () => {
		// Arrange
		const spy = jest.spyOn(console, 'error').mockImplementation();
		// Act
		log('hello', 123, 'extra');
		// Assert
		expect(spy).toHaveBeenCalledWith('[mcp-pr-command] hello', 123, 'extra');
		spy.mockRestore();
	});
});
