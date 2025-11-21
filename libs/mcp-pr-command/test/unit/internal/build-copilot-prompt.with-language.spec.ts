import { buildCopilotPrompt, context } from 'src/internal';

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
		const oldPrompt = context.defaultPrompt;
		context.defaultPrompt = 'Hello %LANGUAGE%!';
		const prompt = buildCopilotPrompt({ changesFile: 'file.txt' });
		expect(prompt).toContain('Hello Portuguese!');
		context.defaultPrompt = oldPrompt;
	});
});
