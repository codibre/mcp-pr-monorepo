// Backwards-compatible shim: the `generateChangesFile` helper used to live
// here but was moved into `GitService.generateChangesFile`. Keep a thin
// delegating export so older imports keep working while you migrate callers.
import { gitService } from '../internal';

export async function generateChangesFile(
	targetBranch: string,
	currentBranch: string,
) {
	return await gitService.generateChangesFile(targetBranch, currentBranch);
}
