// In-memory mock for fs/promises so tests don't touch the real filesystem.
const _store = new Map<string, string>();
const fs: any = {
	readFile: jest.fn(async (p: string) => {
		return _store.get(p);
	}),
	writeFile: jest.fn(async (p: string, data: string | Buffer) => {
		_store.set(p, typeof data === 'string' ? data : data.toString('utf8'));
	}),
	mkdir: jest.fn(async (_p: string, _opts?: any) => undefined),
	stat: jest.fn(async (p: string) => {
		if (!_store.has(p)) throw new Error('ENOENT');
		return { isFile: () => true };
	}),
	rmdir: jest.fn(async (dir: string, _opts?: any) => {
		for (const k of Array.from(_store.keys())) {
			if (k.startsWith(dir)) _store.delete(k);
		}
	}),
	open: jest.fn(async (p: string) => ({
		write: async (buf: Buffer | string) => {
			const prev = _store.get(p) || '';
			_store.set(
				p,
				prev + (Buffer.isBuffer(buf) ? buf.toString('utf8') : String(buf)),
			);
		},
		close: async () => undefined,
	})),
	constants: { O_CREAT: 1, O_RDWR: 2 },
};

jest.mock('fs/promises', () => fs);
import path from 'path';
import os from 'os';
import {
	createTempFile,
	createSystemTempFile,
	clearTempDir,
} from 'src/internal/temp-file';
import { contextService } from 'src/internal';

describe('temp-file helpers', () => {
	const tmpRoot = path.join(os.tmpdir(), `mcp-pr-command-test-${Date.now()}`);

	beforeEach(() => {
		jest.spyOn(contextService, 'cwd', 'get').mockReturnValue(tmpRoot);
	});

	it('writes a string to a temp file', async () => {
		const p = await createTempFile('hello.txt', 'hello world');
		const content = await fs.readFile(p, { encoding: 'utf8' });
		expect(content).toBe('hello world');
	});

	it('writes from an async iterable', async () => {
		async function* gen() {
			yield 'line1\n';
			yield Buffer.from('line2\n');
		}
		const p = await createTempFile('iter.txt', gen);
		const content = await fs.readFile(p, { encoding: 'utf8' });
		expect(content).toBe('line1\nline2\n');
	});

	it('creates a file in system temp folder', async () => {
		const p = await createSystemTempFile('sys.txt', 'sys');
		const content = await fs.readFile(p, { encoding: 'utf8' });
		expect(content).toBe('sys');
	});

	it('clearTempDir removes .tmp under cwd', async () => {
		// create a file under cwd/.tmp
		const dir = path.join(tmpRoot, '.tmp');
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(path.join(dir, 'f.txt'), 'x');
		await clearTempDir();
		// directory should be gone
		let exists = true;
		try {
			await fs.stat(dir);
		} catch {
			exists = false;
		}
		expect(exists).toBe(false);
	});
});
