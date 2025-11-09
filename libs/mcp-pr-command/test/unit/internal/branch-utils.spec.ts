import * as branchUtils from '../../../src/internal/branch-utils';
import { context } from '../../../src/internal/context';
import { DEFAULT_BRANCH_SCHEMA } from '../../../src/internal/internal-options';

// Arrange
const customSchema = {
	FEAT_BRANCH: 'develop',
	BUGFIX_BRANCH: 'develop',
	HOTFIX_BRANCH: 'main',
	RELEASE_BRANCH: 'main',
	DEV_BRANCH: 'develop',
};

describe('branch-utils', () => {
	beforeEach(() => {
		context.branchSchema = DEFAULT_BRANCH_SCHEMA;
	});

	describe('getBranchSchema', () => {
		it('should return DEFAULT_BRANCH_SCHEMA if context.branchSchema is undefined', () => {
			// Act
			const schema = branchUtils.getBranchSchema('/any/path');
			// Assert
			expect(schema).toEqual(DEFAULT_BRANCH_SCHEMA);
		});

		it('should return context.branchSchema if it is an object', () => {
			context.branchSchema = customSchema as any;
			// Act
			const schema = branchUtils.getBranchSchema('/any/path');
			// Assert
			expect(schema).toBe(customSchema);
		});

		it('should call context.branchSchema if it is a function', () => {
			const fn = jest.fn().mockReturnValue(customSchema);
			context.branchSchema = fn;
			// Act
			const schema = branchUtils.getBranchSchema('/cwd');
			// Assert
			expect(fn).toHaveBeenCalledWith('/cwd');
			expect(schema).toBe(customSchema);
		});
	});

	describe('getProtectedList', () => {
		it('should return a FluentIterable of protected branch names', () => {
			context.branchSchema = customSchema as any;
			// Act
			const list = branchUtils.getProtectedList('/cwd');
			// Assert
			expect(list.toArray()).toEqual([
				'develop',
				'develop',
				'main',
				'main',
				'develop',
			]);
		});
	});

	describe('isProtectedBranch', () => {
		it('should return true if branch is protected', () => {
			context.branchSchema = customSchema as any;
			// Act & Assert
			expect(branchUtils.isProtectedBranch('main', '/cwd')).toBe(true);
			expect(branchUtils.isProtectedBranch('develop', '/cwd')).toBe(true);
		});

		it('should return false if branch is not protected', () => {
			context.branchSchema = customSchema as any;
			// Act & Assert
			expect(branchUtils.isProtectedBranch('feature/test', '/cwd')).toBe(false);
		});
	});
});
