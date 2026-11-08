# 🍝 clinguini

A very tiny CLI builder. For me. Maybe for you.

Native TypeScript. Node.js compatible. Zero runtime dependencies.

Typed helper factories, argument parsing, command execution and built-in utilities are implemented.
The npm package ships JavaScript and TypeScript declarations for plain Node.js consumers.

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
Required params cannot follow optional params.

`commands` declares subcommands recursively. A matching child name takes precedence
over a positional param until the first positional value or `--` stops command selection.
Flag values are consumed separately, even when they match a subcommand name.
Flags belong to their declaring command and must appear before the next subcommand;
they are not inherited by children.

For a `config` command with an optional `file` param, a string `--profile` flag and
a `set` subcommand taking `key` and `value`:

```sh
tool config set theme dark  # config → set; key=theme, value=dark
tool config settings.json   # config; file=settings.json
tool config -- set          # config; file=set
tool config --profile set   # config; profile=set (flag value)
```

The internal `args/index.ts` parser returns the root-to-target command path. Each entry
contains its command definition, local flags and params. Only the last entry binds
positional params; ancestor handlers are not invoked by parsing.

Calling a command group without choosing a command displays that group's help.
Help recursively lists the selected command and its descendants.

Flags are optional. Boolean flags default to `false` when absent and are `true` when supplied.
String and number flags are `undefined` when absent, unless `default` is set.
`shortForm` provides a single-letter alias. String and number values accept
`--base main` or `--base=main`. Required flags are outside the current scope.
Repeated flags use the last value. `--` ends flag parsing. Boolean flags do not
take values. Number values must be finite and nonempty. Invalid values and defaults
are logged and rejected; unknown flags and missing or extra arguments are rejected.

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
Utility flags are consumed internally and excluded from handler flags. Verbose mode prints
the selected command to stderr and includes stack traces for handler failures.
Enabled utility names and aliases must not conflict with application flags.

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
bun run build
bun run check
bun run test
bun run test:coverage
bun run lint
bun run format
```

Prettier and ESLint follow the shared agent-tests configuration, without its
Svelte-specific plugins. These tools are development dependencies only.

Tests cover command routing, scoped flags, defaults, params, conversions, factory behavior
and the package's runtime/type export boundaries. Schema fixtures in `tests/schemas.ts`
model bref-ui's CLI at `7096f75` and agent-tests' documented commands at `5e5d90c`.
The agent-tests executable is currently a Hello World stub, so its fixture checks the
documented schema rather than an implemented CLI.

Package tests build and install a tarball offline, exercise the public API with plain Node,
and typecheck a separate TypeScript consumer. To also compile and exercise Bref's real
handlers from a local checkout, run:

```sh
BREF_UI_DIR=/path/to/bref-ui bun run test
```

The Bref integration uses temporary consumer projects and covers help, initialization,
component installation, repeat runs, cancellation, overwrite approval and invalid input.
Bref-specific component-ID validation stays in the application adapter. The `--` separator
extends Bref's current bespoke parser. Clinguini uses exit code `2` for argument errors;
Bref's current executable uses `1` for all errors.

## Publishing

`npm pack` and `npm publish` compile TypeScript into `dist/` through `prepack`.
Only compiled JavaScript, declarations and package documentation are shipped.
Consumers need Node.js 22+ and no TypeScript loader or runtime dependencies.
`npm pack --dry-run` builds and previews the package contents.

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
