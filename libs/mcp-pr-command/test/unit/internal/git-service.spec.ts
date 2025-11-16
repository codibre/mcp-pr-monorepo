import { contextService, gitService } from 'src/internal';
import * as tempFileLib from '../../../src/internal/temp-file';

describe('GitService.generateChangesFile', () => {
	const target = 'main';
	const current = 'feature-x';

	beforeEach(() => {
		jest.spyOn(contextService, 'cwd', 'get').mockReturnValue('/cwd');
	});

	it('writes commits, diff summary and code diff into a temp file', async () => {
		// Arrange
		jest
			.spyOn(gitService, 'refExists')
			.mockImplementation(async (ref: string, opts?: any) => {
				// current branch is present locally
				if (ref === current && opts?.where === 'local') return true;
				// target branch must exist on remote
				if (ref === target && opts?.where === 'remote') return true;
				return false;
			});

		const commitsPayload =
			'First commit message\n---ENDCOMMIT---\nSecond commit\n---ENDCOMMIT---\n';
		jest.spyOn(gitService, 'logRange').mockResolvedValue(commitsPayload);

		jest
			.spyOn(gitService, 'diff')
			.mockImplementation(async (_t: string, _c: string, opts?: any) => {
				if (opts?.stat) return 'file1.js | 2 ++\n';
				return 'diff --git a/file1.js b/file1.js\n+added line\n';
			});
		const captured: string[] = [];
		jest
			.spyOn(tempFileLib, 'createTempFile')
			.mockImplementation(
				async (_fileName: string, content: tempFileLib.FileContent) => {
					if (typeof content === 'string') {
						captured.push(content);
						return '/tmp/fake-copilot-changes.txt';
					}
					const iterable = typeof content === 'function' ? content() : content;
					for await (const chunk of iterable) {
						captured.push(
							Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk),
						);
					}
					return '/tmp/fake-copilot-changes.txt';
				},
			);

		// Act
		const filePath = await gitService.generateChangesFile(target, current);

		// Assert
		expect(filePath).toBe('/tmp/fake-copilot-changes.txt');
		expect(captured.join('')).toBe(`=== COMMIT ===
First commit message

---

Second commit

---

=== DIFF SUMMARY ===
file1.js | 2 ++


=== CODE DIFF ===
diff --git a/file1.js b/file1.js
+added line
`);
	});
});
