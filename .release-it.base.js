const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cwd = process.cwd();
const pkgPath = path.resolve(cwd, 'package.json');
if (!fs.existsSync(pkgPath)) {
  throw new Error('package.json not found in current working directory: ' + cwd);
}
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const top = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
if (!top) throw new Error('Unable to determine git repository top-level directory');

const commitTemplatePath = path.resolve(__dirname, 'commit.hbs');
let commitTemplate = fs.existsSync(commitTemplatePath)
  ? fs.readFileSync(commitTemplatePath).toString()
  : '#### {{subject}}\n\n{{#if body}}{{{body}}}{{/if}}';

// Determine repository URL (prefer package.json repository, fall back to git remote)
function normalizeRepoUrl(raw) {
  if (!raw) return null;
  // remove git+ prefix and trailing .git
  let url = raw.replace(/^git\+/, '').replace(/\.git$/, '');
  // Convert ssh style 'git@github.com:owner/repo' to https
  const sshMatch = url.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    url = `https://${sshMatch[1]}/${sshMatch[2]}`;
  }
  // If it's an scp-like ssh url (ssh://git@...), remove the ssh://
  url = url.replace(/^ssh:\/\//, 'https://').replace(/\/$/, '');
  return url;
}

function detectRepoUrl() {
  const repo = pkg.repository && (pkg.repository.url || pkg.repository);
  const normalized = normalizeRepoUrl(repo);
  if (normalized) return normalized;

  try {
    const raw = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const normalized = normalizeRepoUrl(raw);
    if (normalized) return normalized;
  } catch (e) {
    // ignore
  }

  return null;
}

const typeMap = {
  feat: 'Features:',
  fix: 'Fixes:',
}

const packageName = pkg.name;
const repoUrl = detectRepoUrl();

// Derive owner/repository from repoUrl for gh API calls (single place)
let ghOwner = '';
let ghRepo = '';
if (repoUrl) {
  const _m = repoUrl.match(/^https?:\/\/[^\/]+\/([^\/]+)\/([^\/]+)(?:\/|$)/);
  if (_m) {
    ghOwner = _m[1];
    ghRepo = _m[2];
  }
}

if (!ghOwner || !ghRepo) throw new Error('Unable to determine GitHub owner/repository from repository URL: ' + repoUrl);

// Detect packageManager from repository root package.json (prefers git top-level)
function getRootPackageManager() {
  if (pkg.packageManager && typeof pkg.packageManager === 'string') {
    return pkg.packageManager.split('@')[0];
  }
  return "npm";
}

const rootPackageManager = getRootPackageManager();
if (repoUrl && commitTemplate.indexOf('/commit/{{hash}}') !== -1) {
  // replace any hardcoded commit host path with the detected repo URL
  // matches patterns like https://github.com/owner/repo/commit/{{hash}}
    commitTemplate = commitTemplate.replace(/https?:\/\/[^\s\/]+\/[\w.-]+\/[\w.-]+\/commit\/\{\{hash\}\}/g, `${repoUrl}/commit/{{hash}}`);
}
  // Replace placeholder used in commit.hbs
  if (commitTemplate.indexOf('__REPO_URL__') !== -1) {
    commitTemplate = commitTemplate.replace(/__REPO_URL__/g, repoUrl);
  }

/** @type {import('release-it').ReleaseConfig} **/
module.exports = {
  git: (function () {
    // Decide tagName based on whether we're at the repository root (monorepo handling)
    let tagName = 'v${version}';
    let commitMessage = 'chore: release v${version} [skip ci]';
    try {
      if (path.resolve(top) !== path.resolve(cwd)) {
        // Not at repo root -> try to use package name
        if (packageName) {
          tagName = packageName + '@${version}';
          commitMessage = 'chore(release): release ' + packageName + '@${version} [skip ci]';
        }
      }
    } catch (e) {
      // keep defaults on any error
    }
    return {
      tagName,
      commitMessage,
      requireCleanWorkingDir: false,
      commitsPath: '.',
      push: true,
      pushRepo: 'origin',
      requireCommits: false
    };
  })(),
  npm: {
    publish: false,
    skipChecks: true,
    versionArgs: '--workspaces=false'
  },
  hooks: (function () {
    if (pkg && pkg.scripts && pkg.scripts['custom:publish']) {
      const mgr = rootPackageManager === 'pnpm' ? 'pnpm' : 'npm';
      return { 'after:bump': `${mgr} run custom:publish` };
    }

    if (rootPackageManager === 'pnpm') {
      return {
        'after:bump': 'pnpm publish --no-git-checks'
      };
    }
    return {};
  })(),
  github: { release: false },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: {
        name: 'conventionalcommits',
        types: [
          { type: 'feat', section: 'Features:' },
          { type: 'fix', section: 'Fixes:' },
        ],
      },
      infile: 'CHANGELOG.md',
      ignoreRecommendedBump: false,
      strictSemVer: true,
      commitsPath: '.',
      gitRawCommitsOpts: {
        path: '.',
        // subject, blank line, body, blank line, hash on its own line
        format: '%s%n%n%b%n%H',
      },
      writerOpts: {
  commitPartial: commitTemplate,
  headerPartial: `{{#if repoUrl}}
## [{{version}}]({{repoUrl}}/compare/{{previousTag}}...{{currentTag}}) ({{date}})

{{#if pullRequests}}
### Pull Requests:

{{#each pullRequests}}- {{#if this.markdown}}{{{this.markdown}}}{{else}}#{{this.number}}{{/if}}
{{/each}}
{{/if}}
{{else}}
## [{{version}}]({{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}) ({{date}})

{{#if pullRequests}}
### Pull Requests:

{{#each pullRequests}}- {{#if this.markdown}}{{{this.markdown}}}{{else}}#{{this.number}}{{/if}}
{{/each}}
{{/if}}
{{/if}}`,
    finalizeContext: function (context) {
          // Primary source for Pull Requests: scan git commits between previousTag and currentTag
          context.packageName = packageName;
          try {
            const prev = context.previousTag || '';
            let curr = context.currentTag || '';
            // If currentTag is present but doesn't resolve yet (dry-run computed tag), fall back to HEAD
            if (curr) {
              try {
                execSync(`git rev-parse --verify --quiet ${curr}`);
              } catch (e) {
                curr = '';
              }
            }
            const range = prev ? `${prev}..${(curr || 'HEAD')}` : (curr || 'HEAD');
            const gitOut = execSync(`git log ${range} --pretty=format:%s%n%b`, { encoding: 'utf8' });
            const prsSet = new Set();
            for (const m of gitOut.matchAll(/(?:Merge pull request\s+#|#)(\d+)\b/ig)) {
              if (m[1]) prsSet.add(m[1]);
            }
            // Also catch 'pull request 123' patterns
            for (const m of gitOut.matchAll(/pull request\s+#?(\d+)/ig)) {
              if (m[1]) prsSet.add(m[1]);
            }
            const prs = Array.from(prsSet).map(n => Number(n)).filter(n => !isNaN(n)).sort((a, b) => a - b).map(String);
            // Build PR objects with markdown links when repo base is available
            let prBase = null;
            if (repoUrl) {
              // `repoUrl` is already normalized by detectRepoUrl()
              prBase = repoUrl.replace(/\/$/, '');
            }

            if (prBase) {
              context.pullRequests = prs.map(n => {
                const url = prBase + '/pull/' + n;
                let markdown = `[#${n}](${url})`;
                  try {
                      const ghOut = execSync(`gh api repos/${ghOwner}/${ghRepo}/pulls/${n} --method GET -H "Accept: application/vnd.github.v3+json"`, { encoding: 'utf8' });
                      const pr = JSON.parse(ghOut);
                      const prWebUrl = (pr && (pr.html_url || pr.htmlUrl)) || url;
                      if (pr && pr.title) markdown = `[#${n} - ${pr.title.replace(/\n/g, ' ')}](${prWebUrl})`;
                  } catch (e) {
                    console.error(`Warning: unable to fetch PR #${n} details via gh CLI: ${e.message}`);
                  }
                return { number: n, url, markdown };
              });
            } else {
              // fallback to plain text number if we can't determine repo base
              context.pullRequests = prs.map(n => ({ number: n, markdown: `#${n}` }));
            }
            // Ensure host/owner/repository are available for templates that build URLs
            try {
              let host = context.host || '';
              let owner = context.owner || '';
              let repository = context.repository || '';
              if ((!host || !owner || !repository) && repoUrl) {
                const m = repoUrl.match(/^https?:\/\/([^\/]+)\/([^\/]+)\/([^\/]+)(?:\/|$)/);
                if (m) {
                  host = m[1];
                  owner = m[2];
                  repository = m[3];
                }
              }
              if ((!host || !owner || !repository)) {
                try {
                  const raw = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
                  const normalized = normalizeRepoUrl(raw);
                  const m2 = normalized && normalized.match(/^https?:\/\/([^\/]+)\/([^\/]+)\/([^\/]+)(?:\/|$)/);
                  if (m2) {
                    host = host || m2[1];
                    owner = owner || m2[2];
                    repository = repository || m2[3];
                  }
                } catch (e) {
                  // ignore
                }
              }
                context.host = host;
                context.owner = owner;
                context.repository = repository;
                if (repoUrl) context.repoUrl = repoUrl;
            } catch (e) {
              // ignore
            }
          } catch (e) {
            context.pullRequests = [];
          }
          return context;
        },
        transform: function (commit) {
          const out = Object.assign({}, commit);

          // Map commit type to section title
          const typeTitle = typeMap[out.type];
          if (!typeTitle) return null;
          out.type = typeTitle;

          if (out.hash && typeof out.hash === 'string') out.hash = out.hash.substring(0, 7);
          // If hash wasn't provided separately, try to extract it from the end of the body
          if ((!out.hash || out.hash.length === 0) && out.body && typeof out.body === 'string') {
            const m = out.body.match(/([0-9a-f]{7,40})$/m);
            if (m) {
              out.hash = m[1].substring(0, 7);
              // remove the trailing hash (and any preceding newline/whitespace) from the body
              out.body = out.body.replace(/(?:\r?\n)?[0-9a-f]{7,40}\s*$/m, '').trim();
            }
          }

          if (out.body && typeof out.body === 'string') {
            out.body = out.body.replace(/\r\n/g, '\n').split('\n').map(l => l.trim() ? ('> ' + l) : '').join('\n').trim();
          }
          return out;
        },
        groupBy: 'type',
        commitGroupsSort: 'title',
        commitsSort: ['scope', 'subject'],
      },
      skipOnEmpty: true,
    },
  },
};
