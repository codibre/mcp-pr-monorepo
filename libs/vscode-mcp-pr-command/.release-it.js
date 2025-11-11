// The canonical release-it base config is stored at the repository root
// (../../.release-it.base.js). When CI runs release from inside the
// package folder the relative path must reach the repo root.
const base = require('../../.release-it.base');

module.exports = Object.assign({}, base, {
	hooks: {
		// Package after the version bump so the generated .vsix contains the bumped version
		'after:bump': 'pnpm dlx vsce package --out ${npm.name}-${version}.vsix',
	},
});
