import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { createConsumer, execute } from './package-fixture.js';
import { brefEntry } from './bref-ui-adapter.js';

/** Copy Bref without changing its working tree or its CLI suite. */
export const prepareBref = (context) => {
	const bref = resolve(process.env.BREF_UI_DIR);
	const { directory } = createConsumer(context);
	const workspace = join(directory, 'bref');
	const core = join(workspace, 'core');
	const oracle = join(directory, 'oracle');
	mkdirSync(workspace);
	cpSync(join(bref, 'core'), core, {
		recursive: true,
		filter: (path) => !['node_modules', '.svelte-kit', 'dist-cli'].includes(basename(path))
	});
	for (const path of ['LICENSE', 'readme.md', 'scripts/package.mjs']) {
		mkdirSync(dirname(join(workspace, path)), { recursive: true });
		cpSync(join(bref, path), join(workspace, path));
	}
	mkdirSync(join(workspace, 'themes'));
	mkdirSync(join(core, 'node_modules'));
	for (const name of readdirSync(join(bref, 'core/node_modules')))
		symlinkSync(join(bref, 'core/node_modules', name), join(core, 'node_modules', name));
	const suite = ['cli.test.js', 'cli-fixture.js'].map((name) => ({
		name,
		bytes: readFileSync(join(bref, 'core/tests', name))
	}));
	const runSuite = () => {
		for (const { name, bytes } of suite)
			assert.deepEqual(readFileSync(join(core, 'tests', name)), bytes);
		const result = execute(
			'node',
			[join(core, 'node_modules/vitest/vitest.mjs'), 'run', '--config', 'vitest.config.js'],
			core,
			'',
			0,
			120_000
		);
		context.diagnostic(result.stdout.trim());
	};
	const replaceEntry = () => {
		mkdirSync(oracle);
		cpSync(join(core, 'dist-cli'), join(oracle, 'dist-cli'), { recursive: true });
		mkdirSync(join(oracle, 'src'));
		symlinkSync(join(core, 'src/lib'), join(oracle, 'src/lib'));
		symlinkSync(join(core, 'node_modules'), join(oracle, 'node_modules'));
		const manifest = JSON.parse(readFileSync(join(core, 'package.json'), 'utf8'));
		const installed = join(directory, 'node_modules/clinguini');
		manifest.dependencies.clinguini = JSON.parse(
			readFileSync(join(installed, 'package.json'), 'utf8')
		).version;
		manifest.bundleDependencies = [...(manifest.bundleDependencies ?? []), 'clinguini'];
		writeFileSync(join(core, 'package.json'), JSON.stringify(manifest, null, 2));
		cpSync(installed, join(core, 'node_modules/clinguini'), { recursive: true });
		writeFileSync(join(core, 'cli/index.ts'), brefEntry);
	};
	return { directory, core, oracle, runSuite, replaceEntry };
};
