import {
	DEFAULT_BRANCH_MAPPING,
	DEFAULT_BRANCH_SCHEMA,
} from 'src/internal/internal-options';

describe('internal-options', () => {
	it('DEFAULT_BRANCH_SCHEMA contains expected keys', () => {
		expect(DEFAULT_BRANCH_SCHEMA).toHaveProperty('production');
		expect(DEFAULT_BRANCH_SCHEMA).toHaveProperty('homologation');
		expect(DEFAULT_BRANCH_SCHEMA).toHaveProperty('development');
	});

	it('DEFAULT_BRANCH_MAPPING contains common types', () => {
		expect(DEFAULT_BRANCH_MAPPING).toHaveProperty('feat');
		expect(DEFAULT_BRANCH_MAPPING).toHaveProperty('fix');
		expect(DEFAULT_BRANCH_MAPPING).toHaveProperty('hotfix');
		expect(DEFAULT_BRANCH_MAPPING).toHaveProperty('release');
	});
});
