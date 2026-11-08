import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = fileURLToPath(new URL('..', import.meta.url));

export const execute = (command, args, cwd, input = '', status = 0) => {
	const result = spawnSync(command, args, { cwd, input, encoding: 'utf8', timeout: 30_000 });
	assert.ifError(result.error);
	assert.equal(
		result.status,
		status,
		`${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`
	);
	return result;
};

/** Pack and install through npm, using no network or consumer TS loader. */
export const createConsumer = (context) => {
	const directory = mkdtempSync(join(tmpdir(), 'clinguini-consumer-'));
	context.after(() => rmSync(directory, { recursive: true, force: true }));
	writeFileSync(join(directory, 'package.json'), '{"private":true,"type":"module"}');
	const packed = JSON.parse(
		execute('npm', ['pack', '--json', '--pack-destination', directory], root).stdout
	)[0];
	execute(
		'npm',
		[
			'install',
			'--offline',
			'--ignore-scripts',
			'--no-audit',
			'--no-fund',
			join(directory, packed.filename)
		],
		directory
	);
	return { directory, packed };
};
