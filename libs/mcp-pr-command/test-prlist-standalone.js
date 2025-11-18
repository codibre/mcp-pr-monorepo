#!/usr/bin/env node

/**
 * Standalone integration test for GhApiClient.prList
 * This bypasses Jest and directly tests the compiled code.
 * Run with: node test-prlist-standalone.js
 */

const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');

// Ensure the package is built first
const { execSync } = require('child_process');
console.log('Building package...');
execSync('pnpm build', { cwd: __dirname, stdio: 'inherit' });

// Set up minimal context to avoid "cwd not defined" errors
// Mock the context service's AsyncLocalStorage behavior
const contextStore = new AsyncLocalStorage();
const repoRoot = execSync('git rev-parse --show-toplevel', {
	encoding: 'utf8',
}).trim();

// Override the internal context service export before importing anything else
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
	if (id.endsWith('/context-service')) {
		return {
			contextService: {
				get cwd() {
					return repoRoot;
				},
			},
		};
	}
	return originalRequire.apply(this, arguments);
};

async function testPrList() {
	try {
		// Verify gh auth token is available
		try {
			execSync('gh auth token', { stdio: 'pipe' });
			console.log('✓ GitHub CLI authenticated');
		} catch (e) {
			console.error('✗ GitHub CLI not authenticated. Run: gh auth login');
			process.exit(1);
		}

		// Import the compiled GhApiClient
		const { GhApiClient } = require('./dist/internal/gh-client-api');

		console.log('Creating GhApiClient instance...');
		const client = new GhApiClient();

		console.log('Calling prList({ base: "main", head: "more-coverage" })...');
		const result = await client.prList({
			base: 'main',
			head: 'Farenheith-patch-1',
		});

		console.log('✓ prList call succeeded');
		console.log('Result:', JSON.stringify(result, null, 2));

		if (Array.isArray(result)) {
			console.log(`✓ Returned array with ${result.length} items`);
			if (result.length > 0) {
				console.log('✓ Found PR(s) matching the criteria');
			} else {
				console.log(
					'ℹ No PRs found (this is normal if no PR exists for more-coverage -> main)',
				);
			}
		} else {
			console.log('✗ Expected array but got:', typeof result);
			process.exit(1);
		}

		console.log('\n🎉 Test completed successfully');
	} catch (error) {
		console.error('✗ Test failed:', error.message);
		console.error('Stack:', error.stack);
		process.exit(1);
	}
}

// Run within context to ensure cwd is available
contextStore.run({ cwd: repoRoot }, () => {
	testPrList().catch(console.error);
});
