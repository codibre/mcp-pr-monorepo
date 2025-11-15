import { BranchSchema } from 'src/mcp-pr-command-options';
import { context } from './context';
import { DEFAULT_BRANCH_SCHEMA } from './internal-options';
import { FluentIterable, fluentObject } from '@codibre/fluent-iterable';
import { contextService } from './context-service';

// Branch helpers now read the current working directory from ContextService
export const getBranchSchema = (): BranchSchema =>
	typeof context.branchSchema === 'function'
		? context.branchSchema(contextService.cwd)
		: (context.branchSchema ?? DEFAULT_BRANCH_SCHEMA);

export const getProtectedList = (): FluentIterable<string> =>
	fluentObject(getBranchSchema()).map(1);

export const isProtectedBranch = (branchName: string) =>
	getProtectedList().contains(branchName);
