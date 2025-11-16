describe('GhApiClient', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.restoreAllMocks();
		process.env.USE_GH_CLI = 'true';
	});

	it('prEdit throws when search item has no pull_request url', async () => {
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const request = jest.fn().mockResolvedValue({ data: { items: [{}] } });
		const OctokitMock = jest.fn().mockImplementation(() => ({ request }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const fsPromises = require('fs/promises');
		jest.spyOn(fsPromises, 'readFile').mockResolvedValue('BODY');

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		await expect(client.prEdit(11, 'T', '/tmp/body')).rejects.toThrow(
			'PR api url not found',
		);
	});

	it('prEdit throws when parsed api url cannot extract repo', async () => {
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const fakeItem = {
			pull_request: { url: 'https://api.github.com/some/other/path' },
		};
		const request = jest
			.fn()
			.mockResolvedValue({ data: { items: [fakeItem] } });
		const OctokitMock = jest.fn().mockImplementation(() => ({ request }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const fsPromises = require('fs/promises');
		jest.spyOn(fsPromises, 'readFile').mockResolvedValue('BODY');

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		await expect(client.prEdit(12, 'T', '/tmp/body')).rejects.toThrow(
			'Could not parse repo from PR url',
		);
	});

	it('prList falls back to search when pulls.list throws', async () => {
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				if (cmd === 'gh auth token') return 'token';
				if (cmd.includes('git')) return 'git@github.com:ownerx/repx.git';
				return '';
			},
		}));

		const pullsList = jest.fn().mockRejectedValue(new Error('boom')); // throws
		const request = jest
			.fn()
			.mockResolvedValue({ data: { items: [{ number: 77 }] } });
		const OctokitMock = jest
			.fn()
			.mockImplementation(() => ({
				rest: { pulls: { list: pullsList } },
				request,
			}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const list = await client.prList({ base: 'main', head: 'feature' });
		expect(list).toEqual([{ number: 77 }]);
		expect(request).toHaveBeenCalled();
	});

	it('prView falls back to search when pulls.get throws', async () => {
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				if (cmd === 'gh auth token') return 'token';
				if (cmd.includes('git')) return 'git@github.com:who/repo.git';
				return '';
			},
		}));

		const get = jest.fn().mockRejectedValue(new Error('boom'));
		const request = jest
			.fn()
			.mockResolvedValue({
				data: { items: [{ title: 'S', body: 'B', html_url: 'U' }] },
			});
		const OctokitMock = jest
			.fn()
			.mockImplementation(() => ({ rest: { pulls: { get } }, request }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const v = await client.prView(5, ['title']);
		expect(v).toEqual({ title: 'S', body: 'B', url: 'U' });
		expect(request).toHaveBeenCalled();
	});

	it('prView returns null when search response has no items property', async () => {
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const request = jest.fn().mockResolvedValue({ data: {} });
		const OctokitMock = jest.fn().mockImplementation(() => ({ request }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const res = await client.prView(9, ['title']);
		expect(res).toBeNull();
	});

	it('prCreate returns empty string when create has no html_url', async () => {
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				if (cmd === 'gh auth token') return 'token';
				if (cmd.includes('git')) return 'git@github.com:who/proj.git';
				return '';
			},
		}));

		const create = jest.fn().mockResolvedValue({ data: {} });
		const OctokitMock = jest
			.fn()
			.mockImplementation(() => ({
				rest: { pulls: { create } },
				request: jest.fn(),
			}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const fsPromises = require('fs/promises');
		jest.spyOn(fsPromises, 'readFile').mockResolvedValue('BODY TEXT');

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const url = await client.prCreate({
			base: 'main',
			head: 'who:branch',
			title: 'T',
			bodyFile: '/tmp/file',
		});
		expect(url).toBe('');
	});

	it('getOwnerRepoFromGit continues on failing candidates and matches only valid remote', async () => {
		let call = 0;
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				call++;
				if (cmd === 'gh auth token') return 'token';
				// first two candidates throw, third returns a mixed remote list that includes a matching url
				if (call <= 2) throw new Error('boom');
				if (cmd.includes('git'))
					{return 'origin	git@github.com:good/rep.git (fetch)\norigin	ssh://git@github.com:bad/skip.git (push)';}
				return '';
			},
		}));

		const OctokitMock = jest
			.fn()
			.mockImplementation(() => ({
				request: jest.fn(),
				rest: {
					pulls: {
						list: jest.fn().mockResolvedValue({ data: [{ number: 1 }] }),
					},
				},
			}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const list = await client.prList({ base: 'a', head: 'b' });
		expect(list).toEqual([{ number: 1 }]);
	});

	it('searchIssueByNumber handles item with missing fields and returns defaults', async () => {
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const request = jest
			.fn()
			.mockResolvedValue({ data: { items: [{}, { pull_request: null }] } });
		const OctokitMock = jest.fn().mockImplementation(() => ({ request }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		// call prView which uses searchIssueByNumber when owner/repo cannot be derived
		const res = await client.prView(1234, ['title']);
		expect(res).toEqual({ title: '', body: '', url: '' });
		// calling searchIssueByNumber via private path isn't possible; this ensures the code path hitting items with empty shapes is exercised
		expect(request).toHaveBeenCalled();
	});

	it('prCreate throws when owner/repo cannot be resolved', async () => {
		// no git remotes -> resolveOwnerRepoOrThrow should throw
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const OctokitMock = jest
			.fn()
			.mockImplementation(() => ({
				request: jest.fn(),
				rest: { pulls: { create: jest.fn() } },
			}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const fsPromises = require('fs/promises');
		jest.spyOn(fsPromises, 'readFile').mockResolvedValue('BODY');

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		await expect(
			client.prCreate({
				base: 'main',
				head: 'who:branch',
				title: 'T',
				bodyFile: '/tmp/file',
			}),
		).rejects.toThrow('Could not determine owner/repo from git remotes');
	});

	it('prList uses repo-scoped API when owner/repo derived from git', async () => {
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				if (cmd === 'gh auth token') return 'token';
				if (cmd.includes('git')) return 'git@github.com:owner/repo.git';
				return '';
			},
		}));

		// mock Octokit
		const pullsList = jest.fn().mockResolvedValue({ data: [{ number: 42 }] });
		const OctokitMock = jest.fn().mockImplementation(() => ({
			rest: { pulls: { list: pullsList } },
			request: jest.fn(),
		}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const list = await client.prList({ base: 'main', head: 'feature' });
		expect(list).toEqual([{ number: 42 }]);
		expect(pullsList).toHaveBeenCalled();
	});

	it('prList falls back to search when owner/repo cannot be derived', async () => {
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const request = jest
			.fn()
			.mockResolvedValue({ data: { items: [{ number: 7 }] } });
		const OctokitMock = jest.fn().mockImplementation(() => ({ request }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const list = await client.prList({ base: 'main', head: 'feature' });
		expect(list).toEqual([{ number: 7 }]);
		expect(request).toHaveBeenCalled();
	});

	it('prView uses pulls.get when owner/repo derived and falls back to search', async () => {
		// First case: owner/repo derived
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				if (cmd === 'gh auth token') return 'token';
				if (cmd.includes('git')) return 'https://github.com/own/repo.git';
				return '';
			},
		}));
		const get = jest
			.fn()
			.mockResolvedValue({ data: { title: 'T', body: 'B', html_url: 'U' } });
		const OctokitMock1 = jest.fn().mockImplementation(() => ({
			rest: { pulls: { get } },
			request: jest.fn(),
		}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock1 }));

		let clientModule = require('src/internal/gh-client-api');
		let client = new clientModule.GhApiClient();
		const v1 = await client.prView(1, ['title', 'body']);
		expect(v1).toEqual({ title: 'T', body: 'B', url: 'U' });
		expect(get).toHaveBeenCalled();

		// Second case: fallback to search
		jest.resetModules();
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const request = jest.fn().mockResolvedValue({
			data: { items: [{ title: 'TT', body: 'BB', html_url: 'UU' }] },
		});
		const OctokitMock2 = jest.fn().mockImplementation(() => ({ request }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock2 }));
		clientModule = require('src/internal/gh-client-api');
		client = new clientModule.GhApiClient();
		const v2 = await client.prView(2, ['title']);
		expect(v2).toEqual({ title: 'TT', body: 'BB', url: 'UU' });
	});

	it('prEdit updates PR via parsed api url when owner/repo cannot be derived', async () => {
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const fakeItem = {
			pull_request: { url: 'https://api.github.com/repos/own/repo/pulls/9' },
		};
		const request = jest
			.fn()
			.mockResolvedValue({ data: { items: [fakeItem] } });
		const update = jest.fn().mockResolvedValue({});
		const OctokitMock = jest
			.fn()
			.mockImplementation(() => ({ request, rest: { pulls: { update } } }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const fsPromises = require('fs/promises');
		jest.spyOn(fsPromises, 'readFile').mockResolvedValue('PR BODY');

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		await client.prEdit(9, 'Title', '/tmp/bodyfile');
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: 'own',
				repo: 'repo',
				pull_number: 9,
				title: 'Title',
				body: 'PR BODY',
			}),
		);
	});

	it('prCreate uses resolved owner/repo and returns html_url', async () => {
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				if (cmd === 'gh auth token') return 'token';
				if (cmd.includes('git')) return 'git@github.com:who/proj.git';
				return '';
			},
		}));
		const create = jest
			.fn()
			.mockResolvedValue({ data: { html_url: 'http://pr/123' } });
		const OctokitMock = jest.fn().mockImplementation(() => ({
			rest: { pulls: { create } },
			request: jest.fn(),
		}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const fsPromises = require('fs/promises');
		jest.spyOn(fsPromises, 'readFile').mockResolvedValue('BODY TEXT');

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const url = await client.prCreate({
			base: 'main',
			head: 'who:branch',
			title: 'T',
			bodyFile: '/tmp/file',
		});
		expect(create).toHaveBeenCalled();
		expect(url).toBe('http://pr/123');
	});

	it('prList tolerates a failing git command and still derives owner/repo', async () => {
		// First candidate throws, second returns a valid remote URL
		let call = 0;
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				call++;
				if (cmd === 'gh auth token') return 'token';
				if (call === 1) throw new Error('boom');
				if (cmd.includes('git')) return 'git@github.com:owner2/repo2.git';
				return '';
			},
		}));

		// mock Octokit
		const pullsList = jest.fn().mockResolvedValue({ data: [{ number: 99 }] });
		const OctokitMock = jest.fn().mockImplementation(() => ({
			rest: { pulls: { list: pullsList } },
			request: jest.fn(),
		}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const list = await client.prList({ base: 'main', head: 'feature' });
		expect(list).toEqual([{ number: 99 }]);
		expect(pullsList).toHaveBeenCalled();
	});

	it('prView returns null when search finds no item', async () => {
		jest.doMock('src/internal/run', () => ({ run: async () => '' }));
		const request = jest.fn().mockResolvedValue({ data: { items: [] } });
		const OctokitMock = jest.fn().mockImplementation(() => ({ request }));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		const res = await client.prView(123, ['title']);
		expect(res).toBeNull();
		expect(request).toHaveBeenCalled();
	});

	it('prEdit updates PR via repo-scoped API when owner/repo derived', async () => {
		jest.doMock('src/internal/run', () => ({
			run: async (cmd: string) => {
				if (cmd === 'gh auth token') return 'token';
				if (cmd.includes('git')) return 'git@github.com:own/repo.git';
				return '';
			},
		}));

		const update = jest.fn().mockResolvedValue({});
		const OctokitMock = jest
			.fn()
			.mockImplementation(() => ({
				rest: { pulls: { update } },
				request: jest.fn(),
			}));
		jest.doMock('@octokit/rest', () => ({ Octokit: OctokitMock }));

		const fsPromises = require('fs/promises');
		jest.spyOn(fsPromises, 'readFile').mockResolvedValue('PR BODY');

		const { GhApiClient } = require('src/internal/gh-client-api');
		const client = new GhApiClient();
		await client.prEdit(5, 'New title', '/tmp/body');
		expect(update).toHaveBeenCalledWith(
			expect.objectContaining({
				owner: 'own',
				repo: 'repo',
				pull_number: 5,
				title: 'New title',
				body: 'PR BODY',
			}),
		);
	});
});
