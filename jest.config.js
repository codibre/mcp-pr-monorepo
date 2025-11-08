const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const paths = require(path.join(process.cwd(), 'tsconfig.json')).compilerOptions.paths ?? {};

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testRegex: '\\.spec\\.ts$',
  preset: 'ts-jest',
  coverageDirectory: './coverage',
  moduleFileExtensions: ['js', 'json', 'ts'],
  collectCoverageFrom: ['**/src/**/*.ts'],
  testEnvironment: 'node',
  cacheDirectory: '../../.jest',
  forceExit: true,
  cache: true,
  moduleDirectories: ['node_modules', '../node_modules'],
  clearMocks: true,
  resetModules: true,
  detectOpenHandles: false,
  restoreMocks: true,
  moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: '<rootDir>/' }),
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest'],
  },
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/test/jest-setup.ts'],
};
