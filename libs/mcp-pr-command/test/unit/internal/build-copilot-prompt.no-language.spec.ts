import { buildCopilotPrompt, context } from 'src/internal';

describe('buildCopilotPrompt (no language in context)', () => {
	beforeAll(() => {
		// Remove language from context
		delete context.language;
	});

	it('should use the default language placeholder when context.language is not set', () => {
		const prompt = buildCopilotPrompt({ changesFile: 'changes.txt' });
		expect(prompt).toContain(
			'same language of README.MD, commits or pull request template',
		);
		expect(prompt).toContain('changes.txt');
	});

	it('should replace placeholder in custom basePullRequestPrompt', () => {
		const oldPrompt = context.defaultPrompt;
		context.defaultPrompt = 'Hello %LANGUAGE%!';
		const prompt = buildCopilotPrompt({ changesFile: 'file.txt' });
		expect(prompt).toContain(
			'Hello same language of README.MD, commits or pull request template!',
		);
		context.defaultPrompt = oldPrompt;
	});
});
