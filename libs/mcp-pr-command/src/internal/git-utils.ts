import fs from 'fs';
import path from 'path';
import { attemptCB } from './attempt';
import { getErrorMessage, gitService, LocalType } from '../internal';
import { contextService } from './context-service';
import { cwdJoin } from './cwd';

export async function createTempFile(fileName: string, content: string) {
	const tempFilePath = cwdJoin('.tmp', fileName);
	await fs.promises.mkdir(path.dirname(tempFilePath), { recursive: true });
	await fs.promises.writeFile(tempFilePath, content, { encoding: 'utf8' });
	return tempFilePath;
}

export async function createBackupTag(branchName: string) {
	const timestamp = Date.now();
	const backupTag = `backup/${branchName}/${timestamp}`;
	try {
		// createTag is async now
		await gitService.createTag(backupTag);
		return backupTag;
	} catch (e) {
		throw new Error(`Failed to create backup tag: ${getErrorMessage(e)}`);
	}
}

export const clearTempDir = attemptCB(() =>
	fs.promises.rmdir(path.join(contextService.cwd, '.tmp'), {
		recursive: true,
	}),
);

export async function generateChangesFile(
	targetBranch: string,
	currentBranch: string,
) {
	let currentLocal: LocalType | undefined;

	if (
		await gitService.refExists(currentBranch, {
			where: 'local',
			remote: 'origin',
		})
	) {
		currentLocal = 'local';
	} else if (
		await gitService.refExists(currentBranch, {
			where: 'remote',
			remote: 'origin',
		})
	) {
		currentLocal = 'remote';
	}

	if (!currentLocal) {
		throw new Error(
			`Unable to resolve branch '${currentBranch}' to a valid git ref.`,
		);
	}

	if (
		!(await gitService.refExists(targetBranch, {
			where: 'remote',
			remote: 'origin',
		}))
	) {
		throw new Error(
			`Target branch '${targetBranch}' not found on remote. Please verify the branch name.`,
		);
	}
	const commits = await gitService.logRange(targetBranch, currentBranch, {
		format: 'messages',
		targetLocal: 'remote',
		currentLocal,
	});
	const commitEntries = commits
		.split('\n---ENDCOMMIT---\n')
		.map((c) => c.trim())
		.filter(Boolean);
	const commitsTruncated = commitEntries.join('\n\n---\n\n');
	const diffSummary =
		(await gitService.diff(targetBranch, currentBranch, {
			stat: true,
			targetLocal: 'remote',
			currentLocal,
		})) || 'No diff available';
	let codeDiff = '';
	try {
		codeDiff = await gitService.diff(targetBranch, currentBranch, {
			targetLocal: 'remote',
			currentLocal,
		});
	} catch {
		codeDiff = 'No code diff available';
	}
	const changesContent = `=== COMMITS ===\n${commitsTruncated}\n\n=== DIFF SUMMARY ===\n${diffSummary}\n\n=== CODE DIFF ===\n${codeDiff}`;
	const changesFile = await createTempFile(
		'.copilot-changes.txt',
		changesContent,
	);
	return changesFile;
}
