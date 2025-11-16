describe('tools/index', () => {
	it('should import without error', () => {
		expect(() => require('src/tools')).not.toThrow();
	});
});
