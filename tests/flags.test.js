import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from '../args/index.ts';

const schema = {
	name: 'flags',
	flags: [
		{ name: 'text', type: 'string', shortForm: 't' },
		{ name: 'number', type: 'number', shortForm: 'n' },
		{ name: 'boolean', type: 'boolean', shortForm: 'b' }
	],
	params: [{ name: 'tail', optional: true }]
};

[
	[['--text', 'hello'], 'text', 'hello'],
	[['--text=hello'], 'text', 'hello'],
	[['-t', 'hello'], 'text', 'hello'],
	[['-t=hello'], 'text', 'hello'],
	[['--text='], 'text', ''],
	[['--text=a=b'], 'text', 'a=b'],
	[['--text=-dash'], 'text', '-dash'],
	[['-n', '-2'], 'number', -2],
	[['--number', '-.5'], 'number', -0.5],
	[['-n=-2.5'], 'number', -2.5],
	[['--boolean'], 'boolean', true],
	[['-b'], 'boolean', true]
].map(([args, name, expected]) => {
	test(`flag syntax ${JSON.stringify(args)}`, () => {
		assert.equal(parseArgs(args, schema).at(-1).flags[name], expected);
	});
});

test('absent flags use false or undefined and repeated flags use the last value', () => {
	assert.deepEqual(parseArgs([], schema)[0].flags, {
		text: undefined,
		number: undefined,
		boolean: false
	});
	assert.equal(parseArgs(['-t', 'first', '--text=last'], schema)[0].flags.text, 'last');
});

[
	['string', 42, '42'],
	['string', null, 'null'],
	['string', '', ''],
	['number', '4', 4],
	['number', 0, 0],
	['boolean', 'true', true],
	['boolean', false, false]
].map(([type, fallback, expected]) => {
	test(`${type} defaults parse ${JSON.stringify(fallback)}`, () => {
		const command = { name: 'defaults', flags: [{ name: 'value', type, default: fallback }] };
		assert.equal(parseArgs([], command)[0].flags.value, expected);
	});
});

[
	[['--unknown'], /Unknown flag/],
	[['-bt'], /Unknown flag/],
	[['--no-boolean'], /Unknown flag/],
	[['--text'], /Missing value/],
	[['--text', '-dash'], /Missing value/],
	[['--text', '--'], /Missing value/],
	[['--boolean=false'], /does not take a value/],
	[['-b='], /does not take a value/]
].map(([args, message]) => {
	test(`flag rejection ${JSON.stringify(args)}`, () => {
		assert.throws(() => parseArgs(args, schema), message);
	});
});

test('invalid values and defaults abort parsing and log once', (t) => {
	const error = t.mock.method(console, 'error', () => {});
	assert.throws(() => parseArgs(['--number=bad'], schema), /Invalid value for flag "--number"/);
	['number', 'boolean'].map((type) => {
		assert.throws(
			() =>
				parseArgs([], {
					name: 'defaults',
					flags: [{ name: 'value', type, default: 'bad' }]
				}),
			/Invalid default for flag "--value"/
		);
	});
	assert.equal(error.mock.callCount(), 3);
});

['', 'ab', '1', '--'].map((shortForm) => {
	test(`rejects invalid alias ${JSON.stringify(shortForm)}`, () => {
		assert.throws(
			() =>
				parseArgs([], {
					name: 'alias',
					flags: [{ name: 'value', type: 'string', shortForm }]
				}),
			/Invalid short form/
		);
	});
});

test('aliases are case-sensitive and duplicate names or aliases are rejected', () => {
	const upper = { name: 'case', flags: [{ name: 'value', type: 'boolean', shortForm: 'A' }] };
	assert.equal(parseArgs(['-A'], upper)[0].flags.value, true);
	assert.throws(() => parseArgs(['-a'], upper), /Unknown flag/);
	[
		[
			{ name: 'x', type: 'string' },
			{ name: 'x', type: 'number' }
		],
		[
			{ name: 'x', type: 'string', shortForm: 'a' },
			{ name: 'y', type: 'string', shortForm: 'a' }
		]
	].map((flags) =>
		assert.throws(() => parseArgs([], { name: 'duplicates', flags }), /Duplicate flag/)
	);
});

test('special property names stay ordinary own flag values', () => {
	const names = ['__proto__', 'constructor', 'toString'];
	const flags = names.map((name) => ({ name, type: 'string' }));
	const args = names.map((name) => `--${name}=value`);
	const result = parseArgs(args, { name: 'properties', flags })[0].flags;
	assert.equal(Object.getPrototypeOf(result), Object.prototype);
	names.map((name) => {
		assert.ok(Object.hasOwn(result, name));
		assert.equal(result[name], 'value');
	});
});
