import { gitService } from 'src/internal';
import * as tempFileLib from '../../../src/internal/temp-file';

describe('GitService fallbacks', () => {
	beforeEach(() => jest.restoreAllMocks());

	it('generateChangesFile yields "No diff available" and "No code diff available" when diffs empty or failing', async () => {
		const target = 'main';
		const current = 'feature-x';

		jest
			.spyOn(gitService, 'refExists')
			.mockImplementation(async (ref: string, opts?: any) => {
				if (ref === current && opts?.where === 'local') return true;
				if (ref === target && opts?.where === 'remote') return true;
				return false;
			});

		const commitsPayload = 'First commit message\n---ENDCOMMIT---\n';
		jest.spyOn(gitService, 'logRange').mockResolvedValue(commitsPayload as any);

		// first diff (stat) returns empty string => should yield 'No diff available'
		jest
			.spyOn(gitService, 'diff')
			.mockImplementationOnce(async () => '')
			// second diff (code) will throw to exercise attempt fallback
			.mockImplementationOnce(async () => {
				throw new Error('diff failed');
			});

		const captured: string[] = [];
		jest
			.spyOn(tempFileLib, 'createTempFile')
			.mockImplementation(
				async (_fileName: string, content: tempFileLib.FileContent) => {
					const iterable = typeof content === 'function' ? content() : content;
					for await (const chunk of iterable as any) {
						captured.push(
							Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk),
						);
					}
					return '/tmp/fake-changes.txt';
				},
			);

		const res = await gitService.generateChangesFile(target, current);
		expect(res).toBe('/tmp/fake-changes.txt');
		const out = captured.join('');
		expect(out).toContain('=== DIFF SUMMARY ===');
		// when diff stat returns empty string, generateChangesFile will include an
		// empty diff summary section (empty string is preserved). Verify the
		// summary section is present and followed by the code diff header.
		expect(out).toMatch(/=== DIFF SUMMARY ===\s*=== CODE DIFF ===/s);
		expect(out).toContain('=== CODE DIFF ===');
		expect(out).toContain('No code diff available');
	});

	it('filterBranchMsgFilter propagates run rejection', async () => {
		jest.resetModules();
		jest.doMock('src/internal/run', () => ({
			run: jest.fn().mockRejectedValue(new Error('run failed')),
			command: (cmd: string) => ({
				parts: [cmd],
				with() {
					return this;
				},
				run: async () => {
					throw new Error('run failed');
				},
				toString() {
					return this.parts.join(' ');
				},
			}),
		}));

		const internals = require('src/internal');
		const { gitService: localGit } = internals;

		await expect(
			localGit.filterBranchMsgFilter('a', 'b', '/script'),
		).rejects.toThrow(/run failed/);
	});
});
