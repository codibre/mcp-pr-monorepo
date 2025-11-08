// The canonical release-it base config is stored at the repository root
// (../../.release-it.base.js). When CI runs release from inside the
// package folder the relative path must reach the repo root.
module.exports = require('../../.release-it.base');
