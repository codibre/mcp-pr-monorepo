import { execSync } from 'child_process';
import {
	isWSL,
	normalizePath,
	windowsToWSL,
	wslToWindows,
} from '../../../src/internal/path-utils';

// Mock child_process
jest.mock('child_process');
const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('path-utils', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('isWSL', () => {
		it('should return true if running in WSL', () => {
			// Arrange
			mockedExecSync.mockReturnValue('Linux version 5.10.0-microsoft-standard');

			// Act
			const result = isWSL();

			// Assert
			expect(result).toBe(true);
			expect(mockedExecSync).toHaveBeenCalledWith('uname -r', {
				encoding: 'utf8',
			});
		});

		it('should return false if not running in WSL', () => {
			// Arrange
			mockedExecSync.mockReturnValue('Linux version 5.10.0-generic');

			// Act
			const result = isWSL();

			// Assert
			expect(result).toBe(false);
		});

		it('should return false if uname command fails', () => {
			// Arrange
			mockedExecSync.mockImplementation(() => {
				throw new Error('Command failed');
			});

			// Act
			const result = isWSL();

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('windowsToWSL', () => {
		it('should convert Windows path to WSL using wslpath', () => {
			// Arrange
			const windowsPath = 'C:\\Users\\test\\project';
			mockedExecSync.mockReturnValue('/mnt/c/Users/test/project\n');

			// Act
			const result = windowsToWSL(windowsPath);

			// Assert
			expect(result).toBe('/mnt/c/Users/test/project');
			expect(mockedExecSync).toHaveBeenCalledWith(`wslpath "${windowsPath}"`, {
				encoding: 'utf8',
			});
		});

		it('should use fallback conversion if wslpath fails', () => {
			// Arrange
			const windowsPath = 'D:\\Projects\\myapp';
			mockedExecSync.mockImplementation(() => {
				throw new Error('wslpath not found');
			});

			// Act
			const result = windowsToWSL(windowsPath);

			// Assert
			expect(result).toBe('/mnt/d/Projects/myapp');
		});

		it('should return path unchanged if not a Windows path', () => {
			// Arrange
			const linuxPath = '/home/user/project';

			// Act
			const result = windowsToWSL(linuxPath);

			// Assert
			expect(result).toBe('/home/user/project');
			expect(mockedExecSync).not.toHaveBeenCalled();
		});

		it('should return relative path unchanged', () => {
			// Arrange
			const relativePath = './myproject';

			// Act
			const result = windowsToWSL(relativePath);

			// Assert
			expect(result).toBe('./myproject');
			expect(mockedExecSync).not.toHaveBeenCalled();
		});
	});

	describe('wslToWindows', () => {
		it('should convert WSL path to Windows using wslpath', () => {
			// Arrange
			const wslPath = '/mnt/c/Users/test/project';
			mockedExecSync.mockReturnValue('C:\\Users\\test\\project\n');

			// Act
			const result = wslToWindows(wslPath);

			// Assert
			expect(result).toBe('C:\\Users\\test\\project');
			expect(mockedExecSync).toHaveBeenCalledWith(`wslpath -w "${wslPath}"`, {
				encoding: 'utf8',
			});
		});

		it('should use fallback conversion if wslpath fails', () => {
			// Arrange
			const wslPath = '/mnt/d/Projects/myapp';
			mockedExecSync.mockImplementation(() => {
				throw new Error('wslpath not found');
			});

			// Act
			const result = wslToWindows(wslPath);

			// Assert
			expect(result).toBe('D:\\Projects\\myapp');
		});

		it('should return path unchanged if not a WSL mount path', () => {
			// Arrange
			const linuxPath = '/home/user/project';

			// Act
			const result = wslToWindows(linuxPath);

			// Assert
			expect(result).toBe('/home/user/project');
			expect(mockedExecSync).not.toHaveBeenCalled();
		});
	});

	describe('normalizePath', () => {
		it('should convert Windows path to WSL when running in WSL', () => {
			// Arrange
			const windowsPath = 'C:\\Users\\test\\project';
			mockedExecSync
				.mockReturnValueOnce('Linux version 5.10.0-microsoft-standard') // isWSL check
				.mockReturnValueOnce('/mnt/c/Users/test/project\n'); // windowsToWSL

			// Act
			const result = normalizePath(windowsPath);

			// Assert
			expect(result).toBe('/mnt/c/Users/test/project');
		});

		it('should convert WSL path to Windows when not running in WSL', () => {
			// Arrange
			const wslPath = '/mnt/c/Users/test/project';
			mockedExecSync
				.mockReturnValueOnce('Linux version 5.10.0-generic') // isWSL check
				.mockReturnValueOnce('C:\\Users\\test\\project\n'); // wslToWindows

			// Act
			const result = normalizePath(wslPath);

			// Assert
			expect(result).toBe('C:\\Users\\test\\project');
		});

		it('should return path unchanged if already in correct format', () => {
			// Arrange
			const linuxPath = '/home/user/project';
			mockedExecSync.mockReturnValue('Linux version 5.10.0-microsoft-standard'); // isWSL check

			// Act
			const result = normalizePath(linuxPath);

			// Assert
			expect(result).toBe('/home/user/project');
		});

		it('should handle empty path', () => {
			// Arrange
			const emptyPath = '';

			// Act
			const result = normalizePath(emptyPath);

			// Assert
			expect(result).toBe('');
			expect(mockedExecSync).not.toHaveBeenCalled();
		});
	});
});
