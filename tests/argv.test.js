import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clinguini } from '../index.ts';
import { capture } from './runtime-fixture.js';

test('defaults to process arguments at each call without changing argv', async (context) => {
	const argv = process.argv;
	context.after(() => {
		process.argv = argv;
	});
	const calls = [];
	const config = {
		name: 'tool',
		params: [{ name: 'id' }],
		flags: [{ name: 'jobs', type: 'number' }],
		handler: (values) => calls.push(values)
	};
	for (const id of ['first', 'second']) {
		const args = ['node', '/path/to/cli.js', id, '--jobs', '2'];
		process.argv = [...args];
		const result = await capture(() => clinguini(config));
		assert.deepEqual(result, { stdout: '', stderr: '', exitCode: 0 });
		assert.deepEqual(process.argv, args);
	}
	assert.deepEqual(calls, [
		{ params: { id: 'first' }, flags: { jobs: 2 } },
		{ params: { id: 'second' }, flags: { jobs: 2 } }
	]);
});

test('explicit readonly and empty arrays replace process arguments', async (context) => {
	const argv = process.argv;
	context.after(() => {
		process.argv = argv;
	});
	process.argv = ['node', '/path/to/cli.js', '--unknown'];
	const calls = [];
	const config = {
		name: 'tool',
		params: [{ name: 'id', optional: true }],
		handler: ({ params }) => calls.push(params)
	};
	for (const args of [Object.freeze(['override']), Object.freeze([])]) {
		const result = await capture(() => clinguini(config, args));
		assert.deepEqual(result, { stdout: '', stderr: '', exitCode: 0 });
	}
	assert.deepEqual(calls, [{ id: 'override' }, { id: undefined }]);
	assert.deepEqual(process.argv, ['node', '/path/to/cli.js', '--unknown']);
});
