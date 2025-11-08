# About code editing

- Don't bother about formatting errors. You can just run `npm run lint:fix` after you're done to fix almost all formating errors. If something still remains, then it requires a better attention;
- Try to return early, ie, avoid deeply nested `if` statements and the use of `else` statements, unless absolutely necessary. Prefer ternary operators for simple conditions. This makes the code easier to read and understand;

# Compilation commands

This is a monorepo, so when editing a subproject, prefer to run commands in the directory of that subproject. For example, if you are editing the `context-gb-logger` subproject, run commands in the `libs/context-gb-logger` directory.

- Compiling commands must be run through `npm run build`;
- `npm run lint` tests formatting;
- `npm run lint:fix` fixes almost every formatting error;
- `npm run test` runs every test. You can still use IDEs integrated test runner, though;
- `npm run test:cov` runs every test generating coverage;


# About editing tests

- Tests are located in the `test` directory of each subproject;
- test structure must mirror the structure of the subproject;
- Follow Arrange, Act, Assert (AAA) pattern when writing tests. Consider not calling tested code directly inside an execpt. When testing errors, prefer to use a try catch, capture the error into a variable and then assert it later, to ensure an rigid AAA structure;
- Explicitly comment // Arrange // Act // Assert sections in your tests, so they are easier to read;
- When testing elements exported in src/index, always inport it from src, unless it's something you need to mock or spy on that requires you to import directly from its source due to readonly exports;
- Always cd to subproject folder before running test commands;
- Always run test after editing them;
- When a test is wrong, always fix it, unless you tried three times and it is still failing. In this case, ask for help;
- If you find errors in the code tested, report them before trying to fix them. Explain why it's wrong so the dev can evaluate it. Never ask for permission to do so, just report it;

