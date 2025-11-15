const mockedRun = jest.fn();

jest.mock('src/internal/run', () => ({
	run: mockedRun,
}));

import { isWSL, normalizePath, windowsToWSL, wslToWindows } from 'src/internal';

describe('path-utils', () => {
	describe('isWSL', () => {
		it('should return true if running in WSL', async () => {
			// Arrange
			mockedRun.mockResolvedValueOnce(
				'Linux version 5.10.0-microsoft-standard',
			);

			// Act
			const result = await isWSL();

			// Assert
			expect(result).toBe(true);
			expect(mockedRun).toHaveBeenCalled();
		});

		it('should return false if not running in WSL', async () => {
			// Arrange
			mockedRun.mockResolvedValueOnce('Linux version 5.10.0-generic');

			// Act
			const result = await isWSL();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false if uname command fails', async () => {
			// Arrange
			mockedRun.mockRejectedValueOnce(new Error('Command failed'));

			// Act
			const result = await isWSL();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('windowsToWSL', () => {
		it('should convert Windows path to WSL using wslpath', async () => {
			// Arrange
			const windowsPath = 'C:\\Users\\test\\project';
			mockedRun.mockResolvedValueOnce('/mnt/c/Users/test/project');

			// Act
			const result = await windowsToWSL(windowsPath);

			// Assert
			expect(result).toBe('/mnt/c/Users/test/project');
			expect(mockedRun).toHaveBeenCalled();
		});

		it('should use fallback conversion if wslpath fails', async () => {
			// Arrange
			const windowsPath = 'D:\\Projects\\myapp';
			mockedRun.mockRejectedValueOnce(new Error('wslpath not found'));

			// Act
			const result = await windowsToWSL(windowsPath);

			// Assert
			expect(result).toBe('/mnt/d/Projects/myapp');
		});

		it('should return path unchanged if not a Windows path', async () => {
			// Arrange
			const linuxPath = '/home/user/project';

			// Act
			const result = await windowsToWSL(linuxPath);

			// Assert
			expect(result).toBe('/home/user/project');
			expect(mockedRun).not.toHaveBeenCalled();
		});

		it('should return relative path unchanged', async () => {
			// Arrange
			const relativePath = './myproject';

			// Act
			const result = await windowsToWSL(relativePath);

			// Assert
			expect(result).toBe('./myproject');
			expect(mockedRun).not.toHaveBeenCalled();
		});
	});

	describe('wslToWindows', () => {
		it('should convert WSL path to Windows using wslpath', async () => {
			// Arrange
			const wslPath = '/mnt/c/Users/test/project';
			mockedRun.mockResolvedValueOnce('C:\\Users\\test\\project');

			// Act
			const result = await wslToWindows(wslPath);

			// Assert
			expect(result).toBe('C:\\Users\\test\\project');
			expect(mockedRun).toHaveBeenCalled();
		});

		it('should use fallback conversion if wslpath fails', async () => {
			// Arrange
			const wslPath = '/mnt/d/Projects/myapp';
			mockedRun.mockRejectedValueOnce(new Error('wslpath not found'));

			// Act
			const result = await wslToWindows(wslPath);

			// Assert
			expect(result).toBe('D:\\Projects\\myapp');
		});

		it('should return path unchanged if not a WSL mount path', async () => {
			// Arrange
			const linuxPath = '/home/user/project';

			// Act
			const result = await wslToWindows(linuxPath);

			// Assert
			expect(result).toBe('/home/user/project');
			expect(mockedRun).not.toHaveBeenCalled();
		});
	});

	describe('normalizePath', () => {
		it('should convert Windows path to WSL when running in WSL', async () => {
			// Arrange
			const windowsPath = 'C:\\Users\\test\\project';
			mockedRun
				.mockResolvedValueOnce('Linux version 5.10.0-microsoft-standard')
				.mockResolvedValueOnce('/mnt/c/Users/test/project');

			// Act
			const result = await normalizePath(windowsPath);

			// Assert
			expect(result).toBe('/mnt/c/Users/test/project');
		});

		it('should convert WSL path to Windows when not running in WSL', async () => {
			// Arrange
			const wslPath = '/mnt/c/Users/test/project';
			mockedRun
				.mockResolvedValueOnce('Linux version 5.10.0-generic')
				.mockResolvedValueOnce('C:\\Users\\test\\project');
			// Act
			const result = await normalizePath(wslPath);

			// Assert
			expect(result).toBe('C:\\Users\\test\\project');
		});

		it('should return path unchanged if already in correct format', async () => {
			// Arrange
			const linuxPath = '/home/user/project';
			mockedRun.mockResolvedValueOnce(
				'Linux version 5.10.0-microsoft-standard',
			);

			// Act
			const result = await normalizePath(linuxPath);

			// Assert
			expect(result).toBe('/home/user/project');
		});

		it('should handle empty path', async () => {
			// Arrange
			const emptyPath = '';

			// Act
			const result = await normalizePath(emptyPath);

			// Assert
			expect(result).toBe('');
			expect(mockedRun).not.toHaveBeenCalled();
		});
	});
});
