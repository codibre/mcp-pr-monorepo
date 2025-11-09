import { buildCopilotPrompt } from '../../../src/internal/build-copilot-prompt';
import { context } from '../../../src/internal/context';

describe('buildCopilotPrompt (with language in context)', () => {
	const testLanguage = 'Portuguese';
	beforeAll(() => {
		context.language = testLanguage;
	});
	afterAll(() => {
		delete context.language;
	});

	it('should use the language from context in the prompt', () => {
		const prompt = buildCopilotPrompt({ changesFile: 'changes.txt' });
		expect(prompt).toContain(testLanguage);
		expect(prompt).toContain('changes.txt');
	});

	it('should replace placeholder in custom basePullRequestPrompt', () => {
		const oldPrompt = context.basePullRequestPrompt;
		context.basePullRequestPrompt = 'Hello %LANGUAGE%!';
		const prompt = buildCopilotPrompt({ changesFile: 'file.txt' });
		expect(prompt).toContain('Hello Portuguese!');
		context.basePullRequestPrompt = oldPrompt;
	});
});
