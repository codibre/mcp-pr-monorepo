import { buildCopilotPrompt, context } from 'src/internal';

describe('buildCopilotPrompt (defaultPrompt as object)', () => {
	const additionalText = 'Some additional complementary information.';

	beforeAll(() => {
		// ensure language does not interfere with this test
		delete context.language;
	});

	it('should include additional text from defaultPrompt.additional', () => {
		const oldPrompt = context.defaultPrompt;
		context.defaultPrompt = { additional: additionalText } as any;
		const prompt = buildCopilotPrompt({ changesFile: 'changes.txt' });
		expect(prompt).toContain(additionalText);
		expect(prompt).toContain('changes.txt');
		context.defaultPrompt = oldPrompt;
	});
});
