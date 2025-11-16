import {
	DEFAULT_BRANCH_MAPPING,
	DEFAULT_BRANCH_SCHEMA,
	type InternalOptions,
} from 'src/internal/internal-options';

const McpServerMock = jest.fn().mockImplementation((opts) => ({
	connect: jest.fn().mockResolvedValue(undefined),
	options: opts,
}));
const context: InternalOptions = {
	branchCardIdExtractPattern: undefined,
	cardLinkWebSitePattern: undefined,
	prLinkInferPattern: undefined,
	branchSchema: DEFAULT_BRANCH_SCHEMA,
	branchMapping: DEFAULT_BRANCH_MAPPING,
};
// Mock concrete internal modules instead of the index to avoid readonly export issues
jest.mock('../../src/internal/mcp', () => ({
	McpServer: McpServerMock,
	StdioServerTransport: jest.fn(),
}));
jest.mock('../../src/internal/context', () => ({
	context,
}));
jest.mock('../../src/internal/log', () => ({
	log: jest.fn(),
}));
jest.mock('../../src/internal/package-info', () => ({
	packageInfo: { version: '1.2.3' },
}));

jest.mock('../../src/tools', () => {
	class FakeTool {
		registerTool(server: any) {
			if (!server._registered) server._registered = [];
			server._registered.push(this.constructor.name);
		}
	}
	const mod: any = { ToolA: FakeTool, ToolB: FakeTool };
	// mark __esModule but keep it non-enumerable so fluentObject sees only the classes
	Object.defineProperty(mod, '__esModule', { value: true, enumerable: false });
	return mod;
});

// Import the module under test after the mocks are in place
import { startServer } from '../../src';

describe('startServer', () => {
	beforeEach(() => {
		// reset context
		context.branchCardIdExtractPattern = undefined;
		context.cardLinkWebSitePattern = undefined;
		context.prLinkInferPattern = undefined;
	});

	it('constructs McpServer with package version and registers tools', async () => {
		startServer();

		// McpServer was constructed with name and version
		const McpServer = McpServerMock;
		expect(McpServer).toHaveBeenCalledTimes(1);
		const calledWith = McpServer.mock.calls[0][0];
		expect(calledWith).toMatchObject({
			name: 'mcp-pr-command',
			version: '1.2.3',
		});

		// The mock McpServer instance is the return value of the constructor
		expect(McpServer.mock.results.length).toBeGreaterThan(0);
		const serverInstance = McpServer.mock.results[0]!.value;
		expect(serverInstance).toBeDefined();
		expect(serverInstance._registered).toBeDefined();
		expect(serverInstance._registered.length).toBeGreaterThan(0);
	});

	it('applies options to context and builds prLinkInferPattern correctly', async () => {
		// cast to any to satisfy the test TS types
		startServer({
			cardLinkWebSite: 'https://example.com/',
			cartPathLinkReplacePattern: '/path/to/pr',
			branchCardIdExtractPattern: 'CARD-\\d+',
		} as any);

		expect(context.branchCardIdExtractPattern).toBe('CARD-\\d+');
		// cardLinkWebSitePattern should be a RegExp when created
		expect(context.cardLinkWebSitePattern).toBeInstanceOf(RegExp);
		expect(context.prLinkInferPattern).toBe('https://example.com/path/to/pr');
	});
});
