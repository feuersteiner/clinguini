# 🍝 clinguini

A very tiny CLI builder. For me. Maybe for you.

Native TypeScript. Node.js compatible. Zero runtime dependencies.

**Status:** typed helper factories are implemented.
CLI execution and built-in utilities remain unimplemented.
The examples below describe the intended API.

## Usage

Export commands from separate files using `command()`, then assemble them in the entry file.
The helper defines a command without executing it. The root configuration uses the same `Command` type.

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
		header: '🍝 agent-tests'
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
	params: [{ name: 'path', optional: true }],
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
		await runChecks({ paths: params.path === undefined ? [] : [params.path], ...flags });
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
	params: [{ name: 'id' }, { name: 'targetDir', optional: true }],
	handler: async ({ params }) => {
		if (params.id === undefined) throw new Error('Missing test id');
		await addTest(params.id, params.targetDir);
	}
});
```

Params are strings and required by default. Set `optional: true` to make a param optional.
Each param accepts one value.

Calling a command group without choosing a command displays that group's help.

Flags are optional. Boolean flags are `false` when absent and `true` when supplied.
String and number flags are `undefined` when absent, unless `default` is set.
`shortForm` provides a single-letter alias. String and number values accept
`--base main` or `--base=main`. Required flags are outside the current scope.

Handlers can be sync or async and need no return value. Completion means success;
throwing an error makes clinguini report its message and set exit code `1`.
Invalid arguments are rejected before the handler runs, with exit code `2`.
Handlers can print their own command output.
The `Handler` type receives `params` as a string-or-undefined record and `flags` as a
string, number, boolean or undefined record. Narrow values when a specific type is needed.
Flag defaults use `unknown` and are parsed according to the flag's `type`.

`utils` groups built-in behaviors. Root settings provide defaults; individual commands
can override them. `help` enables generated `--help` / `-h`; `verbose` enables the
`--verbose` / `-v` flag. `header` optionally prints once at startup, using the selected
command's setting. Clinguini's logging stays internal.

```sh
agent-tests
agent-tests run src/ --changed --concurrency 4
agent-tests run --base=main
agent-tests add no-informal-english apps/web
agent-tests run --help
```

## Development

```sh
bun install --frozen-lockfile
bun run check
bun run lint
bun run format
```

Prettier and ESLint follow the shared agent-tests configuration, without its
Svelte-specific plugins. These tools are development dependencies only.

## Publishing

The package ships TypeScript source directly, with no compilation step.
Use Bun or a TypeScript loader on Node.js: Node's built-in type stripping does
not support TypeScript inside `node_modules`.
`npm pack --dry-run` previews the package contents.

First publish and configure GitHub Actions trust (npm 11.15+ and account 2FA required):

```sh
npm login
npm publish --access public
npm trust github clinguini --repo feuersteiner/clinguini --file publish.yml --allow-publish
npm trust list clinguini
```

The package must exist on npm before trust can be configured. See
[npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/).

After setup, bump `version` in `package.json` and push to `main`.
`.github/workflows/publish.yml` checks and publishes directly using OIDC
and provenance, then creates a `clinguini@<version>` GitHub release, like bref-ui.
Manual dispatch is also available; npm rejects already-published versions.
