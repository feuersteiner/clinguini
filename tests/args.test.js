import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from '../args/index.ts';

const set = {
	name: 'set',
	params: [{ name: 'key' }, { name: 'value' }],
	flags: [
		{ name: 'force', type: 'boolean', shortForm: 'f' },
		{ name: 'count', type: 'number', default: '2' }
	],
	handler: () => {
		throw new Error('Parsing must not invoke handlers.');
	}
};
const config = {
	name: 'config',
	params: [{ name: 'file', optional: true }],
	flags: [
		{ name: 'profile', type: 'string', shortForm: 'p' },
		{ name: 'count', type: 'number', default: 3 }
	],
	commands: [set]
};
const root = {
	name: 'tool',
	flags: [{ name: 'verbose', type: 'boolean', shortForm: 'v' }],
	commands: [config]
};

test('selects nested commands before binding their params without invoking handlers', () => {
	const path = parseArgs(['config', 'set', 'theme', 'dark'], root);
	assert.deepEqual(
		path.map(({ command }) => command.name),
		['tool', 'config', 'set']
	);
	assert.equal(path.at(-1).command, set);
	assert.deepEqual(path.at(-1).params, { key: 'theme', value: 'dark' });
	assert.deepEqual(path[1].params, {});
});

test('uses a nonmatching name as the current command’s positional param', () => {
	const target = parseArgs(['config', 'settings.json'], root).at(-1);
	assert.equal(target.command, config);
	assert.deepEqual(target.params, { file: 'settings.json' });
});

test('-- forces a subcommand name to be interpreted as a param', () => {
	const target = parseArgs(['config', '--', 'set'], root).at(-1);
	assert.equal(target.command, config);
	assert.deepEqual(target.params, { file: 'set' });
});

test('separate, inline and alias flag values never select subcommands', () => {
	[['--profile', 'set'], ['--profile=set'], ['-p', 'set']].map((args) => {
		const target = parseArgs(['config', ...args], root).at(-1);
		assert.equal(target.command, config);
		assert.equal(target.flags.profile, 'set');
		assert.deepEqual(target.params, { file: undefined });
	});
});

test('keeps flag values and defaults separate at every command level', () => {
	const path = parseArgs(
		['-v', 'config', '-p', 'dev', '--count=5', 'set', 'theme', 'dark', '-f', '--count', '-2'],
		root
	);
	assert.deepEqual(path[0].flags, { verbose: true });
	assert.deepEqual(path[1].flags, { profile: 'dev', count: 5 });
	assert.deepEqual(path[2].flags, { force: true, count: -2 });
	const defaults = parseArgs(['config', 'set', 'theme', 'dark'], root);
	assert.equal(defaults[1].flags.count, 3);
	assert.equal(defaults[2].flags.count, 2);
});

test('parent flags must precede the child and child flags must follow it', () => {
	assert.throws(
		() => parseArgs(['config', 'set', 'theme', 'dark', '--profile', 'dev'], root),
		/Unknown flag: "--profile"/
	);
	assert.throws(
		() => parseArgs(['config', '-f', 'set', 'theme', 'dark'], root),
		/Unknown flag: "-f"/
	);
});

test('the first positional value stops command selection while flags still parse', () => {
	const command = { ...config, params: [{ name: 'file' }, { name: 'label' }] };
	const target = parseArgs(['settings.json', 'set', '-p', 'dev'], command).at(-1);
	assert.equal(target.command, command);
	assert.deepEqual(target.params, { file: 'settings.json', label: 'set' });
	assert.equal(target.flags.profile, 'dev');
});

test('only the selected command requires positional params', () => {
	const command = { ...config, params: [{ name: 'file' }] };
	const target = parseArgs(['set', 'theme', 'dark'], command).at(-1);
	assert.equal(target.command, set);
	assert.deepEqual(target.params, { key: 'theme', value: 'dark' });
});

test('returns the current group when no child or positional value is supplied', () => {
	assert.equal(parseArgs([], root).at(-1).command, root);
	assert.equal(parseArgs(['config'], root).at(-1).command, config);
});

test('rejects unknown or duplicate subcommands and malformed arguments', () => {
	assert.throws(() => parseArgs(['missing'], root), /Unknown command: "missing"/);
	assert.throws(() => parseArgs(['set'], { ...config, commands: [set, set] }), /Duplicate command/);
	assert.throws(
		() => parseArgs(['config', 'set', 'theme'], root),
		/Missing required param: "value"/
	);
	assert.throws(
		() => parseArgs(['config', 'set', 'a', 'b', 'c'], root),
		/Unexpected argument: "c"/
	);
	assert.throws(() => parseArgs(['config', '-p'], root), /Missing value for flag/);
	assert.throws(() => parseArgs(['config', '-p', '--', 'set'], root), /Missing value for flag/);
	assert.throws(() => parseArgs(['--verbose=false', 'config'], root), /does not take a value/);
});

test('invalid values log their conversion failure and reject the command', () => {
	const messages = [];
	const original = console.error;
	console.error = (message) => messages.push(message);
	try {
		assert.throws(() => parseArgs(['config', '--count=bad'], root), /Invalid value for flag/);
		assert.throws(
			() =>
				parseArgs([], { name: 'bad', flags: [{ name: 'count', type: 'number', default: 'bad' }] }),
			/Invalid default/
		);
		assert.equal(messages.length, 2);
		assert.ok(messages.every((message) => message.includes('non-empty finite number')));
	} finally {
		console.error = original;
	}
});
