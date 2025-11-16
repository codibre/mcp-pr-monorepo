import {
	context,
	contextService,
	DEFAULT_BRANCH_SCHEMA,
	getBranchSchema,
	getProtectedList,
	isProtectedBranch,
} from 'src/internal';

// Arrange
const customSchema = {
	FEAT_BRANCH: 'develop',
	BUGFIX_BRANCH: 'develop',
	HOTFIX_BRANCH: 'main',
	RELEASE_BRANCH: 'main',
	DEV_BRANCH: 'develop',
};

describe('branch-utils', () => {
	let cwd: jest.MockInstance<string, []>;

	beforeEach(() => {
		context.branchSchema = DEFAULT_BRANCH_SCHEMA;
		cwd = jest.spyOn(contextService, 'cwd', 'get').mockReturnValue('/cwd');
	});

	describe('getBranchSchema', () => {
		it('should return DEFAULT_BRANCH_SCHEMA if context.branchSchema is undefined', () => {
			// Arrange
			cwd.mockReturnValueOnce('/any/path');
			// Act
			const schema = getBranchSchema();
			// Assert
			expect(schema).toEqual(DEFAULT_BRANCH_SCHEMA);
		});

		it('should return context.branchSchema if it is an object', () => {
			// Arrange
			cwd.mockReturnValueOnce('/any/path');
			context.branchSchema = customSchema as any;
			// Act
			const schema = getBranchSchema();
			// Assert
			expect(schema).toBe(customSchema);
		});

		it('should call context.branchSchema if it is a function', () => {
			const fn = jest.fn().mockReturnValue(customSchema);
			context.branchSchema = fn;
			// Act
			const schema = getBranchSchema();
			// Assert
			expect(fn).toHaveBeenCalledWith('/cwd');
			expect(schema).toBe(customSchema);
		});
	});

	describe('getProtectedList', () => {
		it('should return a FluentIterable of protected branch names', () => {
			context.branchSchema = customSchema as any;
			// Act
			const list = getProtectedList();
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
			expect(isProtectedBranch('main')).toBe(true);
			expect(isProtectedBranch('develop')).toBe(true);
		});

		it('should return false if branch is not protected', () => {
			context.branchSchema = customSchema as any;
			// Act & Assert
			expect(isProtectedBranch('feature/test')).toBe(false);
		});
	});
});
