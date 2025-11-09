import {
	BranchMappingItem,
	BranchSchema,
	BranchSchemaCallback,
	ChangingBranchType,
} from 'src/mcp-pr-command-options';

export const DEFAULT_BRANCH_SCHEMA: BranchSchema = {
	production: 'main',
	homologation: 'staging',
	development: 'develop',
};

export const DEFAULT_BRANCH_MAPPING: Record<string, BranchMappingItem> = {
	feat: {
		origin: 'homologation',
		target: 'homologation',
	},
	fix: {
		origin: 'homologation',
		target: 'homologation',
	},
	hotfix: {
		origin: 'production',
		target: 'production',
	},
	release: {
		origin: 'homologation',
		target: 'production',
	},
};

export interface InternalOptions {
	branchCardIdExtractPattern?: RegExp;
	cardLinkWebSitePattern?: RegExp;
	prLinkInferPattern?: string;
	language?: string;
	basePullRequestPrompt?: string;
	branchSchema: BranchSchema | BranchSchemaCallback;
	branchMapping: Record<ChangingBranchType, BranchMappingItem>;
}
