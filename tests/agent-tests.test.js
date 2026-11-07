import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from '../args/index.ts';
import { agentTests } from './schemas.ts';

const examples = [
	[['init'], 'init', {}, {}],
	[['add', 'user-text-french'], 'add', { id: 'user-text-french', targetDir: undefined }, {}],
	[
		['add', 'user-text-french', 'apps/web'],
		'add',
		{ id: 'user-text-french', targetDir: 'apps/web' },
		{}
	],
	[['validate', 'user-text-french'], 'validate', { id: 'user-text-french' }, {}],
	[['list'], 'list', {}, {}],
	[['targets', 'user-text-french'], 'targets', { id: 'user-text-french' }, {}],
	[['eval', 'user-text-french'], 'eval', { id: 'user-text-french' }, {}],
	[['run'], 'run', {}, { changed: false, staged: false, base: undefined }],
	[['run', '--changed'], 'run', {}, { changed: true, staged: false, base: undefined }],
	[['run', '--staged'], 'run', {}, { changed: false, staged: true, base: undefined }],
	[['run', '--base', 'main'], 'run', {}, { changed: false, staged: false, base: 'main' }],
	[['docs'], 'docs', {}, {}],
	[['vote', 'user-text-french'], 'vote', { id: 'user-text-french' }, {}]
];

examples.map(([args, name, params, flags]) => {
	test(`agent-tests documented example: ${args.join(' ')}`, () => {
		const path = parseArgs(args, agentTests);
		assert.deepEqual(
			path.map(({ command }) => command.name),
			['agent-tests', name]
		);
		assert.deepEqual(path.at(-1).params, params);
		assert.deepEqual(path.at(-1).flags, flags);
	});
});

agentTests.commands
	.filter(({ params }) => params?.some(({ optional }) => !optional))
	.map((command) => {
		test(`agent-tests ${command.name} requires its test ID`, () => {
			assert.throws(() => parseArgs([command.name], agentTests), /Missing required param: "id"/);
		});
	});

agentTests.commands.map(({ name }) => {
	test(`agent-tests command name ${name} is valid as an add ID`, () => {
		assert.equal(parseArgs(['add', name], agentTests).at(-1).params.id, name);
	});
});

test('agent-tests run preserves base values and applies the last repeated flag', () => {
	const target = parseArgs(
		['run', '--base=main', '--base', 'add', '--changed', '--staged'],
		agentTests
	).at(-1);
	assert.deepEqual(target.flags, { base: 'add', changed: true, staged: true });
});

test('agent-tests -- permits dash-prefixed IDs and paths', () => {
	const target = parseArgs(['add', '--', '-id', '--target'], agentTests).at(-1);
	assert.deepEqual(target.params, { id: '-id', targetDir: '--target' });
});

[
	[['missing'], /Unknown command/],
	[['run', '--base'], /Missing value/],
	[['run', '--base', '--staged'], /Missing value/],
	[['run', '--changed=false'], /does not take a value/],
	[['run', '-c'], /Unknown flag/],
	[['run', 'extra'], /Unexpected argument/],
	[['init', 'extra'], /Unexpected argument/],
	[['list', 'extra'], /Unexpected argument/],
	[['docs', 'extra'], /Unexpected argument/],
	[['add', 'id', 'target', 'extra'], /Unexpected argument/],
	[['add', 'id', '--changed'], /Unknown flag/],
	[['--changed', 'run'], /Unknown flag/]
].map(([args, error]) => {
	test(`agent-tests rejects ${JSON.stringify(args)}`, () => {
		assert.throws(() => parseArgs(args, agentTests), error);
	});
});
