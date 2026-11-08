import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clinguini } from '../index.ts';
import { capture } from './runtime-fixture.js';
import { agentTests, brefUi } from './schemas.ts';

test('awaits only the selected handler with parsed params and local flags', async () => {
	let result;
	const config = {
		name: 'tool',
		handler: () => assert.fail('Ancestor handler ran'),
		flags: [{ name: 'profile', type: 'string' }],
		commands: [
			{
				name: 'run',
				params: [{ name: 'id' }],
				flags: [{ name: 'jobs', type: 'number', default: 4 }],
				handler: async (values) => {
					await Promise.resolve();
					result = values;
				}
			}
		]
	};
	const output = await capture(() => clinguini(['--profile', 'main', 'run', 'check'], config));
	assert.deepEqual(result, { params: { id: 'check' }, flags: { jobs: 4 } });
	assert.deepEqual(output, { stdout: '', stderr: '', exitCode: 0 });
});

test('runs a root handler and preserves application exit codes', async () => {
	const output = await capture(() =>
		clinguini([], {
			name: 'tool',
			handler: () => {
				process.exitCode = 7;
			}
		})
	);
	assert.equal(output.exitCode, 7);
});

for (const args of [['missing'], ['add'], ['add', 'button', 'extra'], ['init', '--unknown']])
	test(`invalid Bref arguments fail before execution: ${JSON.stringify(args)}`, async () => {
		const config = {
			...brefUi,
			commands: brefUi.commands.map((command) => ({
				...command,
				handler: () => assert.fail('Invalid arguments ran a handler')
			}))
		};
		const result = await capture(() => clinguini(args, config));
		assert.equal(result.exitCode, 2);
		assert.match(result.stderr, /^Error: /);
	});

test('handler errors are reported with code 1; verbose includes the stack', async () => {
	const config = {
		name: 'tool',
		utils: { verbose: true },
		handler: async () => {
			throw new Error('Failed');
		}
	};
	const regular = await capture(() => clinguini([], config));
	assert.deepEqual(regular, { stdout: '', stderr: 'Error: Failed', exitCode: 1 });
	const verbose = await capture(() => clinguini(['--verbose'], config));
	assert.equal(verbose.exitCode, 1);
	assert.match(verbose.stderr, /Running tool\.\nError: Failed\n\s+at /);
	const nonError = await capture(() =>
		clinguini([], {
			name: 'tool',
			handler: () => {
				throw 'Failure';
			}
		})
	);
	assert.equal(nonError.stderr, 'Error: Failure');
});

test('agent-tests command shapes reach their handlers unchanged', async () => {
	const examples = [
		['init'],
		['add', 'id'],
		['add', 'id', 'apps/web'],
		['validate', 'id'],
		['list'],
		['targets', 'id'],
		['eval', 'id'],
		['run'],
		['run', '--changed'],
		['run', '--staged'],
		['run', '--base', 'main'],
		['docs'],
		['vote', 'id']
	];
	for (const args of examples) {
		let called;
		const config = {
			...agentTests,
			commands: agentTests.commands.map((command) => ({
				...command,
				handler: (values) => {
					called = { name: command.name, ...values };
				}
			}))
		};
		const result = await capture(() => clinguini(args, config));
		assert.equal(result.exitCode, 0, result.stderr);
		assert.equal(called.name, args[0]);
		if (args[0] === 'add') assert.deepEqual(called.params, { id: 'id', targetDir: args[2] });
		if (args[0] === 'run')
			assert.deepEqual(called.flags, {
				changed: args.includes('--changed'),
				staged: args.includes('--staged'),
				base: args.includes('--base') ? 'main' : undefined
			});
	}
});
