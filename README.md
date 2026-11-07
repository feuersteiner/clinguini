# 🍝 clinguini

A very tiny CLI builder. For me. Maybe for you.

Native TypeScript. Node.js compatible. Zero runtime dependencies.

**Status:** public helper scaffold only; no published package yet.
`index.ts` exports `clinguini()`, `command()`, `flag()`, `param()`, and their types
from `types.ts`. Configuration shapes and CLI execution remain unimplemented.
The examples below describe the intended API.

## Usage

Export commands from separate files using `command()`, then assemble them in the entry file.
The helper preserves handler type inference without executing the command.

`index.ts`:

```typescript
#!/usr/bin/env node
import { clinguini } from 'clinguini';
import { run } from './commands/run.js';
import { add } from './commands/add.js';

await clinguini(process.argv.slice(2), {
	name: 'agent-tests',
	description: 'Run checks against a repository',
	commands: [run, add],
	utils: {
		help: true,
		verbose: true,
		header: '🍝 agent-tests',
		color: 'auto'
	}
});
```

`commands/run.ts`:

```typescript
import { command } from 'clinguini';
import { runChecks } from '../checks.js';

export const run = command({
	name: 'run',
	description: 'Run matching tests',
	params: [{ name: 'paths', type: 'string', optional: true, variadic: true }],
	flags: [
		{
			name: 'changed',
			type: 'boolean',
			shortForm: 'c',
			description: 'Check uncommitted files'
		},
		{ name: 'base', type: 'string', description: 'Compare against a Git reference' },
		{ name: 'concurrency', type: 'number', default: 4 }
	],
	utils: {
		header: 'Running checks'
	},
	handler: async ({ params, flags }) => {
		await runChecks({ paths: params.paths, ...flags });
	}
});
```

`commands/add.ts`:

```typescript
import { command } from 'clinguini';
import { addTest } from '../tests.js';

export const add = command({
	name: 'add',
	description: 'Install a test',
	params: [
		{ name: 'id', type: 'string' },
		{ name: 'targetDir', type: 'string', optional: true }
	],
	handler: async ({ params }) => {
		await addTest(params.id, params.targetDir);
	}
});
```

Params are required by default. Set `optional: true` to make a param optional.

Calling a command group without choosing a command displays that group's help.

Flags are optional. Boolean flags are `false` when absent and `true` when supplied.
String and number flags are `undefined` when absent, unless `default` is set.
`shortForm` provides a single-letter alias. String and number values accept
`--base main` or `--base=main`. Required flags are outside the current scope.

Handlers can be sync or async and need no return value. Completion means success;
throwing an error makes clinguini report its message and set exit code `1`.
Invalid arguments are rejected before the handler runs, with exit code `2`.
Handlers can print their own command output.

`utils` groups built-in behaviors. Root settings provide defaults; individual commands
can override them. `help` enables generated `--help` / `-h`; `verbose` enables the
`--verbose` / `-v` flag. `header` optionally prints once at startup, using the selected
command's setting. `color` accepts `'auto'`, `'always'` or `'never'`; auto uses color in
interactive terminals. Clinguini's logging stays internal.

```sh
agent-tests
agent-tests run src/ tests/ --changed --concurrency 4
agent-tests run --base=main
agent-tests add no-informal-english apps/web
agent-tests run --help
```

## Development

```sh
bun install --frozen-lockfile
bun run lint
bun run format
```

Prettier and ESLint follow the shared agent-tests configuration, without its
Svelte-specific plugins. These tools are development dependencies only.
