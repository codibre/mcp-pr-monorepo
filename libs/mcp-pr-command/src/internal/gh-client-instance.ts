import { GhClient } from './gh-client';
import { GhApiClient } from './gh-client-api';

export const ghClient =
	process.env.USE_GH_CLI === 'true' ? new GhClient() : new GhApiClient();
