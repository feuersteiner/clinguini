# 🍝 clinguini

A very tiny CLI builder. For me. Maybe for you.

Native TypeScript. Node.js compatible. Zero runtime dependencies.

**Status:** specification only. No implementation or published package yet.
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
	positionals: [
		{ name: 'paths', type: 'string', required: false, variadic: true }
	],
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
	handler: async ({ positionals, flags }) => {
		await runChecks({ paths: positionals.paths, ...flags });
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
	positionals: [
		{ name: 'id', type: 'string', required: true },
		{ name: 'targetDir', type: 'string', required: false }
	],
	handler: async ({ positionals }) => {
		await addTest(positionals.id, positionals.targetDir);
	}
});
```

`utils` groups built-in behaviors. Root settings provide defaults; individual commands
can override them. `help` enables generated `--help` / `-h`; `verbose` enables the
`--verbose` / `-v` flag. `header` optionally prints once at startup, using the selected
command's setting. `color` accepts `'auto'`, `'always'` or `'never'`; auto uses color in
interactive terminals. Logging stays internal to clinguini.

```sh
agent-tests run src/ tests/ --changed --concurrency 4
agent-tests run --base=main
agent-tests add no-informal-english apps/web
agent-tests run --help
```
