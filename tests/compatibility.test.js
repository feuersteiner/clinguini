import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clinguini } from '../index.ts';
import { capture } from './runtime-fixture.js';

test('custom help is inherited, awaited and bypasses required params and action handlers', async () => {
	let completed;
	const config = {
		name: 'tool',
		utils: {
			help: async () => {
				await Promise.resolve();
				console.log('Existing help');
				completed = true;
			}
		},
		commands: [{ name: 'add', params: [{ name: 'id' }], handler: () => assert.fail('Action ran') }]
	};
	for (const args of [[], ['--help'], ['add', '-h']]) {
		completed = false;
		const result = await capture(() => clinguini(args, config));
		assert.deepEqual(result, { stdout: 'Existing help', stderr: '', exitCode: 0 });
		assert.equal(completed, true);
	}
});

test('argument error overrides preserve application diagnostics without hiding handler errors', async () => {
	const config = {
		name: 'tool',
		utils: { argumentError: { message: 'Existing usage error', exitCode: 1 } },
		commands: [
			{
				name: 'add',
				params: [{ name: 'id' }],
				handler: () => {
					throw new Error('Application failed');
				}
			}
		]
	};
	for (const args of [['missing'], ['add'], ['add', '--unknown'], ['add', 'id', 'extra']])
		assert.deepEqual(await capture(() => clinguini(args, config)), {
			stdout: '',
			stderr: 'Error: Existing usage error',
			exitCode: 1
		});
	assert.equal(
		(await capture(() => clinguini(['add', 'id'], config))).stderr,
		'Error: Application failed'
	);
});

test('custom help failures use handler error reporting', async () => {
	const result = await capture(() =>
		clinguini(['--help'], {
			name: 'tool',
			utils: {
				help: async () => {
					throw new Error('Help failed');
				},
				argumentError: { message: 'Argument error', exitCode: 7 }
			}
		})
	);
	assert.deepEqual(result, { stdout: '', stderr: 'Error: Help failed', exitCode: 1 });
});
