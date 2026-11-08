# 🍝 clinguini

A very tiny CLI builder. Yes, another one.

[![npm](https://img.shields.io/npm/v/clinguini?logo=npm)](https://www.npmjs.com/package/clinguini)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/D2qy7DNEFz)
[![MIT license](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![minified + gzip](https://img.shields.io/badge/min%2Bgzip-1.89_KiB-brightgreen)](#how-tiny)

Commands, params, flags and generated help. Written in TypeScript. Runs on Node.js.
Zero runtime dependencies. The dependency tree is a stump.

## Get started

Requires **Node.js 22+**. ESM only; TypeScript declarations included.

```sh
npm install clinguini
```

Save as `cli.mjs`:

```javascript
import { clinguini } from 'clinguini';

await clinguini(process.argv.slice(2), {
	name: 'greet',
	description: 'Say hello from the terminal',
	params: [{ name: 'name' }],
	flags: [{ name: 'loud', shortForm: 'l', type: 'boolean' }],
	utils: { help: true },
	handler: ({ params, flags }) => {
		const message = `Hello, ${params.name}!`;
		console.log(flags.loud ? message.toUpperCase() : message);
	}
});
```

```sh
node cli.mjs Ada
# Hello, Ada!

node cli.mjs Ada --loud
# HELLO, ADA!

node cli.mjs --help
```

The same API works in TypeScript; this example runs directly on Node.js.

## The essentials

- Nested commands and reusable definitions across files.
- Required or optional string params; string, number and boolean flags with defaults and aliases.
- Built-in help, optional verbose diagnostics and custom help handlers.
- Sync or async handlers, with error messages and exit codes when things go sideways.

See the [API guide](https://github.com/feuersteiner/clinguini/blob/main/docs/api.md)
for examples and argument rules.

## How tiny?

**1.89 KiB minified + gzip** (1,937 bytes) for the `0.1.1` public runtime,
bundled with Bun 1.3.4. Measured, since apparently “very” is not a unit.

Reproduce from a checkout with Bun installed:

```sh
bun install --frozen-lockfile
bun run build
bun build ./dist/index.js --target=node --format=esm --minify --outfile=/tmp/clinguini.min.mjs
gzip -9 -n -c /tmp/clinguini.min.mjs | wc -c
# 1937
```

This measures the bundled runtime. The npm package also ships unminified JavaScript,
TypeScript declarations and documentation.

## Community

Questions, bugs, unsolicited pasta opinions:
[Discord](https://discord.gg/D2qy7DNEFz) · [GitHub Issues](https://github.com/feuersteiner/clinguini/issues).

Contributing? Start with [agents.md](https://github.com/feuersteiner/clinguini/blob/main/agents.md).
Build, test and release commands live in the [development notes](https://github.com/feuersteiner/clinguini/blob/main/docs/development.md).

## License

[MIT](LICENSE).
