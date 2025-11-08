const jestBase = require('../../jest.config');

// Ensure TypeScript path alias `src/*` resolves to this package's src directory
const moduleNameMapper = Object.assign({}, jestBase.moduleNameMapper || {}, {
	'^src/(.*)$': '<rootDir>/src/$1',
});

module.exports = Object.assign({}, jestBase, { moduleNameMapper });
