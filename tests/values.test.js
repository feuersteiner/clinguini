import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse } from '../parsers.ts';

['', ' ', 'hello', '--flag', 'true', '123'].map((value) => {
	test(`string conversion preserves ${JSON.stringify(value)}`, () => {
		assert.equal(parse(value, 'string'), value);
	});
});

[
	['0', 0],
	['-0', -0],
	['-2', -2],
	['-.5', -0.5],
	['1e3', 1000],
	[' 3 ', 3],
	['0x10', 16],
	['0b10', 2],
	['0o10', 8],
	['5.', 5]
].map(([value, expected]) => {
	test(`number conversion accepts ${JSON.stringify(value)}`, () => {
		assert.equal(parse(value, 'number'), expected);
	});
});

['', ' ', 'NaN', 'Infinity', '-Infinity', '1e999', '1px', '--1', '1,2'].map((value) => {
	test(`number conversion rejects ${JSON.stringify(value)} and logs its reason`, (t) => {
		const error = t.mock.method(console, 'error', () => {});
		assert.equal(parse(value, 'number'), undefined);
		assert.equal(error.mock.callCount(), 1);
		assert.match(error.mock.calls[0].arguments[0], /non-empty finite number/);
	});
});

[
	['true', true],
	['false', false]
].map(([value, expected]) => {
	test(`boolean conversion accepts ${value}`, () => {
		assert.equal(parse(value, 'boolean'), expected);
	});
});

['TRUE', 'False', ' true ', '1', '0', '', 'yes'].map((value) => {
	test(`boolean conversion rejects ${JSON.stringify(value)} and logs its reason`, (t) => {
		const error = t.mock.method(console, 'error', () => {});
		assert.equal(parse(value, 'boolean'), undefined);
		assert.equal(error.mock.callCount(), 1);
		assert.match(error.mock.calls[0].arguments[0], /Expected "true" or "false"/);
	});
});

test('unexpected JavaScript coercion failures are caught even when no Error is thrown', (t) => {
	const error = t.mock.method(console, 'error', () => {});
	const value = {
		valueOf: () => {
			throw 'coercion failed';
		}
	};
	assert.equal(parse(value, 'number'), undefined);
	assert.deepEqual(error.mock.calls[0].arguments, ['coercion failed']);
});
