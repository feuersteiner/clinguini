import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseArgs } from '../args/index.ts';

test('required and optional params bind in order, including empty strings and negative values', () => {
	const schema = {
		name: 'params',
		params: [{ name: 'first' }, { name: 'second', optional: true }]
	};
	assert.deepEqual(parseArgs([''], schema)[0].params, { first: '', second: undefined });
	assert.deepEqual(parseArgs(['-2', '-'], schema)[0].params, { first: '-2', second: '-' });
	assert.deepEqual(parseArgs(['-.5'], schema)[0].params, { first: '-.5', second: undefined });
	assert.throws(() => parseArgs([], schema), /Missing required param: "first"/);
	assert.throws(() => parseArgs(['a', 'b', 'c'], schema), /Unexpected argument: "c"/);
});

test('separator preserves flag-shaped values and subsequent separators literally', () => {
	const schema = { name: 'params', params: [{ name: 'first' }, { name: 'second' }] };
	assert.deepEqual(parseArgs(['--', '--flag', '--'], schema)[0].params, {
		first: '--flag',
		second: '--'
	});
	assert.throws(() => parseArgs(['--'], schema), /Missing required param/);
	assert.deepEqual(parseArgs(['--'], { name: 'empty' })[0].params, {});
});

test('duplicate params and required params after optional params are rejected', () => {
	assert.throws(
		() =>
			parseArgs(['a', 'b'], {
				name: 'duplicate',
				params: [{ name: 'x' }, { name: 'x' }]
			}),
		/Duplicate param: "x"/
	);
	assert.throws(
		() =>
			parseArgs(['a', 'b'], {
				name: 'order',
				params: [{ name: 'optional', optional: true }, { name: 'required' }]
			}),
		/cannot follow an optional param/
	);
});

test('params and flags have separate namespaces, including special property names', () => {
	const schema = {
		name: 'properties',
		params: ['__proto__', 'constructor', 'toString'].map((name) => ({ name })),
		flags: [{ name: '__proto__', type: 'string' }]
	};
	const result = parseArgs(['one', '--__proto__=flag', 'two', 'three'], schema)[0];
	assert.deepEqual(
		result.params,
		Object.fromEntries([
			['__proto__', 'one'],
			['constructor', 'two'],
			['toString', 'three']
		])
	);
	assert.equal(result.flags.__proto__, 'flag');
	assert.equal(Object.getPrototypeOf(result.params), Object.prototype);
});
