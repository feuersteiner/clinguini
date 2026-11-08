# API guide

[← clinguini](../README.md)

## Public API

| Export                    | Purpose                                                 |
| ------------------------- | ------------------------------------------------------- |
| `clinguini(args, config)` | Parse arguments, show help or run the selected handler. |
| `command(config)`         | Define a reusable command without executing it.         |
| `flag(config)`            | Define a reusable flag.                                 |
| `param(config)`           | Define a reusable positional parameter.                 |

The helpers return shallow copies. `flag` and `param` preserve inferred literal types;
`command` returns `Command`. TypeScript also exports the `Command`, `Flag`, `Param`
and `Handler` types. Helpers do not validate configuration; parsing does.

## Compose commands

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

## Params

Params are strings and required by default. Set `optional: true` to make a param optional.
Each param accepts one value.
Required params cannot follow optional params.

## Command routing

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

## Flags

Flags are optional. Boolean flags default to `false` when absent and are `true` when supplied.
String and number flags are `undefined` when absent, unless `default` is set.
`shortForm` provides a single-letter alias. String and number values accept
`--base main` or `--base=main`. Required flags are outside the current scope.
Repeated flags use the last value. `--` ends flag parsing. Boolean flags do not
take values. Number values must be finite and nonempty. Invalid values and defaults
are logged and rejected; unknown flags and missing or extra arguments are rejected.

## Handlers and errors

Handlers can be sync or async and need no return value. Completion means success;
throwing an error makes clinguini report its message and set exit code `1`.
Invalid arguments are rejected before the handler runs, with exit code `2`.
Handlers can print their own command output.
The `Handler` type receives `params` as a string-or-undefined record and `flags` as a
string, number, boolean or undefined record. Narrow values when a specific type is needed.
Flag defaults use `unknown` and are parsed according to the flag's `type`.

## Utilities

`utils` groups built-in behaviors. Root settings provide defaults; individual commands
can override them. `help` enables generated `--help` / `-h`; `verbose` enables the
`--verbose` / `-v` flag. `header` optionally prints once at startup, using the selected
command's setting. Clinguini's logging stays internal.
Set `help` to a sync or async function to retain an application's existing help output.
Root `utils.argumentError` can override the argument-error `message` and `exitCode`;
handler failures keep their own messages and exit code `1`.
Utility flags are consumed internally and excluded from handler flags. Verbose mode prints
the selected command to stderr and includes stack traces for handler failures.
Enabled utility names and aliases must not conflict with application flags.

## Example invocations

```sh
agent-tests
agent-tests run src/ --changed --concurrency 4
agent-tests run --base=main
agent-tests add no-informal-english apps/web
agent-tests run --help
```
