import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { AnyIterable, isString } from 'is-this-a-pigeon';
import { fluentAsync } from '@codibre/fluent-iterable';
import { cwdJoin } from './cwd';

const systemTempFolder = path.join(os.tmpdir(), 'mcp-pr-command');

export async function createSystemTempFile(fileName: string, content: string) {
	const tempFilePath = path.join(systemTempFolder, fileName);
	await fs.mkdir(path.dirname(tempFilePath), { recursive: true });
	await fs.writeFile(tempFilePath, content, { encoding: 'utf8' });
	return tempFilePath;
}

export type FileContent =
	| string
	| AnyIterable<string | Buffer>
	| (() => AnyIterable<string | Buffer>);

export async function createTempFile(
	fileName: string,
	content: FileContent,
): Promise<string> {
	const tempFilePath = cwdJoin('.tmp', fileName);
	await fs.mkdir(path.dirname(tempFilePath), { recursive: true });
	if (isString(content)) {
		await fs.writeFile(tempFilePath, content, { encoding: 'utf8' });
		return tempFilePath;
	}

	const file = await fs.open(
		tempFilePath,
		// eslint-disable-next-line no-bitwise
		fs.constants.O_CREAT | fs.constants.O_RDWR,
	);
	await fluentAsync(typeof content === 'function' ? content() : content)
		.filter()
		.map((x) => (isString(x) ? Buffer.from(x, 'utf8') : x))
		.forEach((x) => file.write(x))
		.finally(() => file.close());
	return tempFilePath;
}

export const clearTempDir = () =>
	fs.rmdir(path.join(cwdJoin('.tmp')), {
		recursive: true,
	});
