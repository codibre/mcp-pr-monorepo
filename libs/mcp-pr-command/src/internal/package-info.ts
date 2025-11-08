import type { PackageJson } from 'read-pkg';
import { attempt } from './attempt';

const packageInfo: Partial<PackageJson> =
	attempt(() => require('../../package.json') as Partial<PackageJson>) ?? {};

export { packageInfo };
