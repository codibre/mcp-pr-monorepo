import { context } from 'src/internal/context';
import {
	DEFAULT_BRANCH_MAPPING,
	DEFAULT_BRANCH_SCHEMA,
} from 'src/internal/internal-options';

describe('context defaults', () => {
	it('exports default branch schema and mapping', () => {
		expect(context.branchSchema).toBe(DEFAULT_BRANCH_SCHEMA);
		expect(context.branchMapping).toBe(DEFAULT_BRANCH_MAPPING);
	});
});
