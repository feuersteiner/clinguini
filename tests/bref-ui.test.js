import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from '../args/index.ts';
import { brefUi } from './schemas.ts';

[
	[['init'], { name: 'init' }],
	[['help'], { name: 'help' }],
	[['add', 'button'], { name: 'add', componentId: 'button' }],
	[['add', 'table'], { name: 'add', componentId: 'table' }],
	[['add', 'init'], { name: 'add', componentId: 'init' }],
	[['add', 'help'], { name: 'add', componentId: 'help' }]
].map(([args, expected]) => {
	test(`bref-ui request shape: ${args.join(' ')}`, () => {
		const { command, params, flags } = parseArgs(args, brefUi).at(-1);
		assert.deepEqual({ name: command.name, ...params }, expected);
		assert.deepEqual(flags, {});
	});
});

[
	['unknown'],
	['add'],
	['init', 'extra'],
	['add', '--unknown'],
	['add', 'button', 'extra'],
	['help', 'extra'],
	['INIT'],
	['--unknown']
].map((args) => {
	test(`bref-ui rejects unsupported request ${JSON.stringify(args)}`, () => {
		assert.throws(() => parseArgs(args, brefUi));
	});
});

test('bref-ui no-argument request preserves the group for later help handling', () => {
	const path = parseArgs([], brefUi);
	assert.equal(path.length, 1);
	assert.equal(path[0].command, brefUi);
	assert.deepEqual(path[0].params, {});
});

test('bref-ui schema utility settings do not execute help during argument parsing', () => {
	// Utilities belong to clinguini(), while the internal parser only reads declared flags.
	[['--help'], ['-h'], ['init', '--help'], ['add', '-h']].map((args) => {
		assert.throws(() => parseArgs(args, brefUi), /Unknown flag/);
	});
});

test('generic string params leave bref-ui component ID validation to the application', () => {
	// bref-ui rejects empty and dash-prefixed component IDs beyond its command/param shape.
	['', '-', '-1'].map((componentId) => {
		assert.equal(parseArgs(['add', componentId], brefUi).at(-1).params.componentId, componentId);
	});
});

test('the agreed -- separator extends bref-ui’s current bespoke parser', () => {
	assert.equal(parseArgs(['add', '--', 'button'], brefUi).at(-1).params.componentId, 'button');
});
