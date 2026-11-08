import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { createConsumer, execute, root } from './package-fixture.js';

test(
	'packed clinguini drives real Bref handlers in a plain Node consumer',
	{
		skip: !process.env.BREF_UI_DIR && 'Set BREF_UI_DIR to a bref-ui checkout'
	},
	(context) => {
		const bref = resolve(process.env.BREF_UI_DIR);
		const { directory } = createConsumer(context);
		const compiled = join(directory, 'bref');
		execute(
			'node',
			[
				join(root, 'node_modules/typescript/bin/tsc'),
				'-p',
				join(bref, 'core/cli/tsconfig.json'),
				'--outDir',
				compiled
			],
			root
		);
		symlinkSync(join(bref, 'core/node_modules'), join(compiled, 'node_modules'), 'dir');
		const source = join(bref, 'core/src/lib');
		mkdirSync(join(directory, 'src'));
		symlinkSync(source, join(directory, 'src/lib'), 'dir');
		// Keep Bref-specific ID validation and output in this application adapter.
		writeFileSync(
			join(directory, 'cli.js'),
			`
import { clinguini } from 'clinguini';
import { execute } from './bref/commands/execute.js';
import { parse } from './bref/commands/parse.js';
const config = {
 name: 'bref-ui', utils: { help: true }, commands: [
  { name: 'init', handler: () => execute({ name: 'init' }, process.cwd()) },
  { name: 'add', params: [{ name: 'componentId' }], handler: async ({ params }) => {
    await execute(parse(['add', params.componentId]), process.cwd());
  } },
  { name: 'help', handler: () => execute({ name: 'help' }, process.cwd()) }
 ]
};
await clinguini(process.argv.slice(2), config);
`
		);
		const project = join(directory, 'project');
		mkdirSync(project);
		writeFileSync(join(project, 'package.json'), '{"name":"fixture","private":true}');
		const run = (args, input = '', status = 0) =>
			execute('node', [join(directory, 'cli.js'), ...args], project, input, status);
		const snapshot = () =>
			Object.fromEntries(
				readdirSync(project, { recursive: true, withFileTypes: true })
					.filter((file) => file.isFile())
					.map((file) => {
						const path = join(file.parentPath, file.name);
						return [path.slice(project.length + 1), readFileSync(path, 'utf8')];
					})
			);
		const before = snapshot();
		for (const args of [[], ['help'], ['--help'], ['-h'], ['init', '--help'], ['add', '-h']])
			assert.match(run(args).stdout, /Usage: bref-ui/);
		for (const args of [['unknown'], ['add'], ['init', 'extra'], ['add', '--unknown']])
			run(args, '', 2);
		assert.deepEqual(snapshot(), before);
		run(['add', 'button'], '', 1);
		assert.deepEqual(snapshot(), before);
		assert.match(run(['init']).stdout, /Added #bref imports/);
		const initialized = snapshot();
		assert.match(run(['init']).stdout, /already declares #bref imports/);
		assert.deepEqual(snapshot(), initialized);
		for (const input of ['n\n', '', '\n']) {
			assert.match(run(['add', 'button'], input).stdout, /cancelled/);
			assert.deepEqual(snapshot(), initialized);
		}
		run(['add', 'not-a-component'], '', 1);
		assert.deepEqual(snapshot(), initialized);
		assert.match(run(['add', 'button'], 'y\n').stdout, /Installed button/);
		const installed = snapshot();
		assert.ok(installed['src/lib/ui/button/button.svelte']);
		assert.ok(installed['src/lib/ui/icon/icon.svelte']);
		assert.ok(installed['src/lib/ui/theme/cli-theme.svelte']);
		assert.match(run(['add', 'button'], 'y\n').stdout, /Installed button/);
		assert.deepEqual(snapshot(), installed);
		writeFileSync(join(project, 'src/lib/ui/button/button.svelte'), '<button>Custom</button>\n');
		const modified = snapshot();
		assert.match(run(['add', 'button'], 'n\n').stdout, /cancelled/);
		assert.deepEqual(snapshot(), modified);
		assert.match(run(['add', 'button'], 'y\ny\n').stdout, /Installed button/);
		assert.deepEqual(snapshot(), installed);
		assert.match(run(['add', 'table'], 'y\ny\n').stdout, /Installed table/);
		assert.ok(snapshot()['src/lib/ui/table/table.svelte']);
		for (const id of ['', '-', '-1'])
			assert.match(run(['add', id], '', 1).stderr, /Expected init or add <component>/);
	}
);
