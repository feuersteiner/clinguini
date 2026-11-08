import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { capture } from './runtime-fixture.js';

const snapshot = (directory) =>
	Object.fromEntries(
		readdirSync(directory, { recursive: true, withFileTypes: true })
			.filter((file) => file.isFile())
			.map((file) => {
				const path = join(file.parentPath, file.name);
				return [path.slice(directory.length + 1), readFileSync(path, 'utf8')];
			})
	);

const restore = (directory, files) => {
	rmSync(directory, { recursive: true, force: true });
	mkdirSync(directory);
	for (const [name, content] of Object.entries(files)) {
		mkdirSync(dirname(join(directory, name)), { recursive: true });
		writeFileSync(join(directory, name), content);
	}
};

/** Compare the actual executables' bytes, status and project files after each action. */
export const checkProcesses = ({ oracle, core, directory }) => {
	const project = join(directory, 'process-parity');
	mkdirSync(project);
	writeFileSync(join(project, 'package.json'), '{"private":true,"description":"Keep"}\n');
	const run = (args, input = '') => {
		const before = snapshot(project);
		const results = [];
		for (const executable of [join(oracle, 'dist-cli/index.js'), join(core, 'dist-cli/index.js')]) {
			restore(project, before);
			const result = spawnSync('node', [executable, ...args], {
				cwd: project,
				input,
				encoding: 'utf8',
				timeout: 20_000
			});
			assert.ifError(result.error);
			results.push({
				status: result.status,
				signal: result.signal,
				stdout: result.stdout,
				stderr: result.stderr,
				files: snapshot(project)
			});
		}
		assert.deepEqual(results[1], results[0], JSON.stringify({ args, input }));
	};
	for (const args of [
		[],
		['help'],
		['--help'],
		['-h'],
		['init', '--help'],
		['add', '-h'],
		['unknown'],
		['add'],
		['init', 'extra'],
		['add', '--unknown'],
		['add', 'button']
	])
		run(args);
	run(['init']);
	run(['init']);
	run(['add', 'not-a-component']);
	for (const input of ['', '\n', 'no\n']) run(['add', 'button'], input);
	run(['add', 'button'], 'y\n');
	run(['add', 'button'], 'yes\n');
	writeFileSync(join(project, 'src/lib/ui/button/button.svelte'), '<button>Custom</button>\n');
	writeFileSync(join(project, 'src/lib/ui/index.ts'), 'export const custom = true;\n');
	for (const input of ['n\n', 'y\nn\n', 'y\ny\nn\n', 'y\ny\ny\n']) run(['add', 'button'], input);
	run(['add', 'table'], 'y\ny\n');
};

/** Exhaust command/option placements without starting thousands of processes. */
export const checkArguments = async ({ oracle, core, directory }) => {
	const { runCommand } = await import(pathToFileURL(join(oracle, 'dist-cli/commands/index.js')));
	const replacement = pathToFileURL(join(core, 'dist-cli/index.js'));
	// Any accidental use of Bref's original parser in the replacement must fail.
	writeFileSync(
		join(core, 'dist-cli/commands/parse.js'),
		"throw new Error('Original parser called by replacement');\n"
	);
	const tokens = [
		'init',
		'add',
		'help',
		'button',
		'--help',
		'-h',
		'--',
		'--unknown',
		'',
		'-',
		'-1',
		'extra'
	];
	const cases = [[]];
	let level = [[]];
	for (let depth = 0; depth < 3; depth++) {
		level = level.flatMap((args) => tokens.map((token) => [...args, token]));
		cases.push(...level);
	}
	for (const id of [' space ', '\n', '😀', '--help=true', '-hh', '--HELP', '-.1', '--base=main'])
		cases.push(['add', id]);
	const project = join(directory, 'argument-parity');
	const initial = { 'package.json': '{"private":true}\n' };
	const argv = process.argv;
	const cwd = process.cwd();
	try {
		for (const [index, args] of cases.entries()) {
			process.chdir(directory);
			restore(project, initial);
			process.chdir(project);
			const original = await capture(() => runCommand(args, project));
			const files = snapshot(project);
			process.chdir(directory);
			restore(project, initial);
			process.chdir(project);
			process.argv = ['node', replacement.pathname, ...args];
			const actual = await capture(() => import(`${replacement}?case=${index}`));
			assert.deepEqual(actual, original, JSON.stringify(args));
			assert.deepEqual(snapshot(project), files, JSON.stringify(args));
		}
	} finally {
		process.chdir(cwd);
		process.argv = argv;
	}
	return cases.length;
};
