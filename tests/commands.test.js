import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from '../args/index.ts';

test('command paths support deep nesting without confusing names and values', () => {
	const names = Array.from({ length: 32 }, (_, index) => `level-${index}`);
	const leaf = { name: 'leaf', params: [{ name: 'value' }] };
	const nested = names.reduceRight((child, name) => ({ name, commands: [child] }), leaf);
	const schema = { name: 'tool', commands: [nested] };
	const result = parseArgs([...names, 'leaf', 'level-0'], schema);
	assert.deepEqual(
		result.map(({ command }) => command.name),
		['tool', ...names, 'leaf']
	);
	assert.equal(result.at(-1).params.value, 'level-0');
});

test('same-named flags and aliases retain their local types across scopes', () => {
	const child = { name: 'child', flags: [{ name: 'value', type: 'string', shortForm: 'v' }] };
	const schema = {
		name: 'root',
		flags: [{ name: 'value', type: 'boolean', shortForm: 'v' }],
		commands: [child]
	};
	const path = parseArgs(['-v', 'child', '-v', 'child'], schema);
	assert.equal(path[0].flags.value, true);
	assert.equal(path[1].flags.value, 'child');
});

test('inline flag values containing -- do not stop later command selection', () => {
	const child = { name: 'child' };
	const schema = { name: 'root', flags: [{ name: 'text', type: 'string' }], commands: [child] };
	const path = parseArgs(['--text=--', 'child'], schema);
	assert.equal(path[0].flags.text, '--');
	assert.equal(path.at(-1).command, child);
});

test('a separator at the root prevents every later subcommand match', () => {
	const schema = { name: 'root', params: [{ name: 'name' }], commands: [{ name: 'child' }] };
	const path = parseArgs(['--', 'child'], schema);
	assert.equal(path.length, 1);
	assert.equal(path[0].params.name, 'child');
});

test('independent parses neither mutate inputs nor share flag or param results', () => {
	const child = Object.freeze({
		name: 'child',
		flags: Object.freeze([Object.freeze({ name: 'value', type: 'string' })]),
		params: Object.freeze([Object.freeze({ name: 'id', optional: true })])
	});
	const schema = Object.freeze({ name: 'root', commands: Object.freeze([child]) });
	const args = Object.freeze(['child', '--value=first', 'id']);
	const first = parseArgs(args, schema);
	const second = parseArgs(['child'], schema);
	assert.equal(first.at(-1).command, child);
	assert.deepEqual(second.at(-1).flags, { value: undefined });
	assert.deepEqual(second.at(-1).params, { id: undefined });
	first.at(-1).flags.value = 'changed';
	assert.equal(second.at(-1).flags.value, undefined);
	assert.deepEqual(args, ['child', '--value=first', 'id']);
});

test('only command, params and flags appear in parsed results', () => {
	const path = parseArgs([], { name: 'root' });
	assert.deepEqual(Object.keys(path[0]).sort(), ['command', 'flags', 'params']);
});
