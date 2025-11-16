import path from 'path';
import { contextService } from './context-service';

export function cwdJoin(...parts: string[]) {
	const cwd = contextService.cwd;
	return path.join(cwd, ...parts);
}
