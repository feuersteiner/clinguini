import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clinguini } from '../index.ts';
import { capture } from './runtime-fixture.js';
import { brefUi } from './schemas.ts';

for (const args of [
	[],
	['--help'],
	['-h'],
	['init', '--help'],
	['init', '-h'],
	['add', '--help'],
	['add', '-h']
])
	test(`Bref help succeeds without handlers or required params: ${JSON.stringify(args)}`, async () => {
		const config = {
			...brefUi,
			commands: brefUi.commands.map((command) => ({
				...command,
				handler: () => assert.fail('Help ran a handler')
			}))
		};
		const result = await capture(() => clinguini(args, config));
		assert.equal(result.exitCode, 0);
		assert.equal(result.stderr, '');
		assert.match(result.stdout, /Usage: bref-ui/);
		assert.match(result.stdout, /-h, --help/);
	});

test('nested help describes the full command path, params, flags and children', async () => {
	const config = {
		name: 'tool',
		utils: { help: true },
		commands: [
			{
				name: 'config',
				description: 'Manage config',
				params: [{ name: 'file', optional: true }],
				flags: [{ name: 'profile', type: 'string', shortForm: 'p', description: 'Profile name' }],
				commands: [{ name: 'set', description: 'Set a value' }]
			}
		]
	};
	const result = await capture(() => clinguini(['config', '-h'], config));
	for (const text of [
		'Usage: tool config <command> [file] [options]',
		'Manage config',
		'set  Set a value',
		'-p, --profile <string>  Profile name'
	])
		assert.ok(result.stdout.includes(text));
});

test('utilities inherit, can be disabled and do not mutate the schema', async () => {
	let values;
	const config = {
		name: 'tool',
		utils: { help: true, verbose: true, header: 'Root' },
		commands: [
			{
				name: 'run',
				utils: { help: false, verbose: false, header: '' },
				flags: [{ name: 'help', type: 'string' }],
				handler: (args) => {
					values = args;
				}
			}
		]
	};
	const before = JSON.stringify(config);
	const result = await capture(() => clinguini(['run', '--help', 'custom'], config));
	assert.deepEqual(values.flags, { help: 'custom' });
	assert.equal(result.stdout, '');
	assert.equal(JSON.stringify(config), before);
	assert.equal((await capture(() => clinguini(['run', '-h'], config))).exitCode, 2);
});

test('selected header prints once and verbose diagnostics stay out of handler flags', async () => {
	let values;
	const config = {
		name: 'tool',
		utils: { help: true, verbose: true, header: 'Root' },
		commands: [
			{
				name: 'run',
				utils: { header: 'Child' },
				handler: (args) => {
					values = args;
				}
			}
		]
	};
	const output = await capture(() => clinguini(['-v', 'run'], config));
	assert.equal(output.stdout, 'Child');
	assert.equal(output.stderr, 'Running tool run.');
	assert.deepEqual(values, { params: {}, flags: {} });
	const help = await capture(() => clinguini(['run', '--help'], config));
	assert.equal(help.stdout.split('\n').filter((line) => line === 'Child').length, 1);
});

test('help and verbose flag collisions reject configuration before the handler', async () => {
	for (const flag of [
		{ name: 'help', type: 'string' },
		{ name: 'other', shortForm: 'h', type: 'boolean' },
		{ name: 'verbose', type: 'boolean' }
	]) {
		const result = await capture(() =>
			clinguini([], {
				name: 'tool',
				utils: { help: true, verbose: true },
				flags: [flag],
				handler: () => assert.fail('Conflicting flags ran')
			})
		);
		assert.equal(result.exitCode, 2);
		assert.match(result.stderr, /Duplicate flag/);
	}
});

test('a command without a handler shows help, including its header', async () => {
	const result = await capture(() => clinguini([], { name: 'tool', utils: { header: 'Header' } }));
	assert.deepEqual(result, { stdout: 'Header\nUsage: tool', stderr: '', exitCode: 0 });
});

test('the separator and inline string values preserve literal help tokens', async () => {
	let values;
	const config = {
		name: 'tool',
		utils: { help: true },
		params: [{ name: 'id' }],
		flags: [{ name: 'text', type: 'string' }],
		handler: (args) => {
			values = args;
		}
	};
	const result = await capture(() => clinguini(['--text=--help', '--', '--help'], config));
	assert.equal(result.exitCode, 0);
	assert.deepEqual(values, { params: { id: '--help' }, flags: { text: '--help' } });
});
