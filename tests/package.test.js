import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { createConsumer, execute, root } from './package-fixture.js';

test('installed npm package runs on plain Node and supplies usable declarations', (context) => {
	const { directory, packed } = createConsumer(context);
	assert.ok(packed.files.some(({ path }) => path === 'dist/index.js'));
	assert.ok(packed.files.some(({ path }) => path === 'dist/index.d.ts'));
	assert.ok(
		packed.files.every(
			({ path }) => !path.startsWith('tests/') && (!path.endsWith('.ts') || path.endsWith('.d.ts'))
		)
	);
	writeFileSync(
		join(directory, 'cli.js'),
		`
import { clinguini, command } from 'clinguini';
await clinguini({
 name: 'consumer', utils: { help: true },
 commands: [command({ name: 'add', params: [{ name: 'id' }], handler: async ({ params }) => {
  await Promise.resolve();
  if (params.id === 'fail') throw new Error('Handler failed');
  console.log(JSON.stringify(params));
 } })]
});
`
	);
	assert.equal(
		execute('node', ['cli.js', 'add', 'button'], directory).stdout.trim(),
		'{"id":"button"}'
	);
	assert.match(
		execute('node', ['cli.js', 'add', '-h'], directory).stdout,
		/Usage: consumer add <id>/
	);
	assert.match(
		execute('node', ['cli.js', 'add'], directory, '', 2).stderr,
		/Missing required param/
	);
	assert.match(
		execute('node', ['cli.js', 'add', 'fail'], directory, '', 1).stderr,
		/Handler failed/
	);
	writeFileSync(
		join(directory, 'override.js'),
		`
import { clinguini } from 'clinguini';
await clinguini({
 name: 'consumer', params: [{ name: 'id' }],
 handler: ({ params }) => console.log(params.id)
}, Object.freeze(['override']));
`
	);
	assert.equal(execute('node', ['override.js', '--unknown'], directory).stdout.trim(), 'override');
	for (const path of ['args', 'dist/args/index.js', 'types.ts', 'package.json'])
		assert.match(
			execute(
				'node',
				['--input-type=module', '-e', `await import('clinguini/${path}')`],
				directory,
				'',
				1
			).stderr,
			/ERR_PACKAGE_PATH_NOT_EXPORTED/
		);
	writeFileSync(
		join(directory, 'consumer.ts'),
		`
import { clinguini, command, flag, param } from 'clinguini';
import type { Command, Handler, Flag, Param } from 'clinguini';
const handler: Handler = async ({ params, flags }) => { String(params.id); Number(flags.jobs); };
const option: Flag = flag({ name: 'jobs', type: 'number', default: 4 });
const argument: Param = param({ name: 'id' });
const config: Command = command({ name: 'tool', params: [argument], flags: [option], handler });
await clinguini(config);
const args: readonly string[] = ['id'];
await clinguini(config, args);
`
	);
	execute(
		'node',
		[
			join(root, 'node_modules/typescript/bin/tsc'),
			'--noEmit',
			'--strict',
			'--target',
			'ES2022',
			'--module',
			'NodeNext',
			'consumer.ts'
		],
		directory
	);
});
