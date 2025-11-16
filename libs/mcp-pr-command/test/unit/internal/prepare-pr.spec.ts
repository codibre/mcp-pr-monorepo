import { preparePr } from '../../../src/internal/prepare-pr';
import { ghClient } from '../../../src/internal/gh-client-instance';
import { gitService } from '../../../src/internal/git-service';
import * as tempFile from '../../../src/internal/temp-file';
import { contextService } from '../../../src/internal/context-service';
import fs from 'fs/promises';

describe('preparePr', () => {
	const originalCwd = process.cwd();
	beforeEach(() => jest.restoreAllMocks());
	afterEach(() => process.chdir(originalCwd));

	test('happy path with no existing PR and local/remote branches present', async () => {
		jest.spyOn(ghClient, 'prList').mockResolvedValue([] as any);
		jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
		jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
		jest
			.spyOn(gitService, 'generateChangesFile')
			.mockResolvedValue('/tmp/changes' as any);
		jest
			.spyOn(tempFile, 'createTempFile')
			.mockResolvedValue('/tmp/prcontent' as any);
		jest.spyOn(contextService, 'cwd', 'get').mockReturnValue(process.cwd());

		const res = (await preparePr({
			targetBranch: 'main',
			currentBranch: 'feat',
		})) as any;
		// Result uses buildTextResult: check content and structuredContent
		expect(res.content?.[0]?.text).toMatch(
			/Prepared PR artifacts successfully/,
		);
		expect(res.structuredContent?.filesToRead).toContain('/tmp/changes');
	});
});

test('existing PR path includes prContent file and prNumber', async () => {
	jest.restoreAllMocks();
	jest.spyOn(ghClient, 'prList').mockResolvedValue([{ number: 42 }] as any);
	jest
		.spyOn(ghClient, 'prView')
		.mockResolvedValue({ title: 'T', body: 'B' } as any);
	jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
	jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
	jest
		.spyOn(gitService, 'generateChangesFile')
		.mockResolvedValue('/tmp/changes' as any);
	jest
		.spyOn(tempFile, 'createTempFile')
		.mockResolvedValue('/tmp/prcontent' as any);
	jest.spyOn(contextService, 'cwd', 'get').mockReturnValue(process.cwd());

	const res = (await preparePr({
		targetBranch: 'main',
		currentBranch: 'feat',
	})) as any;
	expect(res.structuredContent?.prNumber).toBe(42);
	expect(res.structuredContent?.filesToRead).toContain('/tmp/prcontent');
});

test('throws when target branch not found locally or remotely', async () => {
	jest.restoreAllMocks();
	jest.spyOn(ghClient, 'prList').mockResolvedValue([] as any);
	jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
	// both local and remote refs do not exist
	jest.spyOn(gitService, 'refExists').mockResolvedValue(false as any);
	jest.spyOn(contextService, 'cwd', 'get').mockReturnValue(process.cwd());

	await expect(
		preparePr({ targetBranch: 'missing', currentBranch: 'feat' } as any),
	).rejects.toThrow(/Target branch 'missing' not found locally or on remote/);
});

test('detects .github pull_request_template and includes cardLink', async () => {
	jest.restoreAllMocks();
	// simulate .github exists and contains the template file
	jest.spyOn(fs, 'access').mockResolvedValue(undefined as any);
	jest
		.spyOn(fs, 'readdir')
		.mockResolvedValue(['PULL_REQUEST_TEMPLATE.md'] as any);
	jest.spyOn(ghClient, 'prList').mockResolvedValue([] as any);
	jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
	jest.spyOn(gitService, 'refExists').mockResolvedValue(true as any);
	jest
		.spyOn(gitService, 'generateChangesFile')
		.mockResolvedValue('/tmp/changes' as any);
	jest
		.spyOn(tempFile, 'createTempFile')
		.mockResolvedValue('/tmp/prcontent' as any);
	jest.spyOn(contextService, 'cwd', 'get').mockReturnValue(process.cwd());

	const res = (await preparePr({
		targetBranch: 'main',
		currentBranch: 'feat',
		cardLink: 'http://card/1',
	} as any)) as any;
	expect(res.structuredContent?.prTemplate).toBe(
		'.github/PULL_REQUEST_TEMPLATE.md',
	);
	expect(res.structuredContent?.cardLinks).toContain('http://card/1');
});

test('creates local branch from remote when local missing and remote exists', async () => {
	jest.restoreAllMocks();
	jest.spyOn(ghClient, 'prList').mockResolvedValue([] as any);
	jest.spyOn(gitService, 'fetch').mockResolvedValue(undefined as any);
	// refExists should return false for local, true for remote
	jest
		.spyOn(gitService, 'refExists')
		.mockImplementation((b: any, opts: any) => {
			if (opts && opts.where === 'local') return Promise.resolve(false as any);
			return Promise.resolve(true as any);
		});
	const createSpy = jest
		.spyOn(gitService, 'createLocalBranchFromRemote')
		.mockResolvedValue(undefined as any);
	jest
		.spyOn(gitService, 'generateChangesFile')
		.mockResolvedValue('/tmp/changes' as any);
	jest
		.spyOn(tempFile, 'createTempFile')
		.mockResolvedValue('/tmp/prcontent' as any);
	jest.spyOn(contextService, 'cwd', 'get').mockReturnValue(process.cwd());

	const res = (await preparePr({
		targetBranch: 'main',
		currentBranch: 'feat',
	} as any)) as any;
	expect(createSpy).toHaveBeenCalled();
	expect(res.structuredContent?.filesToRead).toContain('/tmp/changes');
});
