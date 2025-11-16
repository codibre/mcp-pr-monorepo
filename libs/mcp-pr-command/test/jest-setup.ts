import 'jest-callslike';
import 'jest-extended';

const matchers = require('jest-extended');
expect.extend(matchers);

export const Octokit = jest.fn();

jest.mock('@octokit/rest', () => ({
	Octokit,
}));

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});
