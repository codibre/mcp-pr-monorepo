import { BranchSchema } from 'src/mcp-pr-command-options';
import { context } from './context';
import { DEFAULT_BRANCH_SCHEMA } from './internal-options';
import { FluentIterable, fluentObject } from '@codibre/fluent-iterable';

export const getBranchSchema = (cwd: string): BranchSchema =>
	typeof context.branchSchema === 'function'
		? context.branchSchema(cwd)
		: (context.branchSchema ?? DEFAULT_BRANCH_SCHEMA);

export const getProtectedList = (cwd: string): FluentIterable<string> =>
	fluentObject(getBranchSchema(cwd)).map(1);

export const isProtectedBranch = (branchName: string, cwd: string) =>
	getProtectedList(cwd).contains(branchName);
