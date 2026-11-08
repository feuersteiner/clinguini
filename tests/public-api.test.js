import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';
import * as api from '../index.ts';

test('package root exposes only the four public factories at runtime', async () => {
	const installedApi = await import('clinguini');
	assert.deepEqual(Object.keys(api).sort(), ['clinguini', 'command', 'flag', 'param']);
	assert.deepEqual(Object.keys(installedApi).sort(), Object.keys(api).sort());
});

[
	'args',
	'args/index.ts',
	'args/commands.ts',
	'args/flags.ts',
	'args/params.ts',
	'parsers.ts',
	'types.ts',
	'package.json'
].map((path) => {
	test(`package boundary blocks internal subpath ${path}`, async () => {
		await assert.rejects(import(`clinguini/${path}`), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
	});
});

test('public type exports exclude Metadata, Utils and parsing helpers', () => {
	const configPath = fileURLToPath(new URL('../tsconfig.json', import.meta.url));
	const config = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsed = ts.parseJsonConfigFileContent(
		config.config,
		ts.sys,
		fileURLToPath(new URL('..', import.meta.url))
	);
	const program = ts.createProgram(parsed.fileNames, parsed.options);
	const checker = program.getTypeChecker();
	const source = program.getSourceFile(fileURLToPath(new URL('../index.ts', import.meta.url)));
	const module = checker.getSymbolAtLocation(source);
	const names = checker
		.getExportsOfModule(module)
		.map(({ name }) => name)
		.sort();
	assert.deepEqual(names, [
		'Command',
		'Flag',
		'Handler',
		'Param',
		'clinguini',
		'command',
		'flag',
		'param'
	]);
	const types = program.getSourceFile(fileURLToPath(new URL('../types.ts', import.meta.url)));
	assert.deepEqual(
		checker
			.getExportsOfModule(checker.getSymbolAtLocation(types))
			.map(({ name }) => name)
			.sort(),
		['Command', 'Flag', 'Handler', 'Param']
	);
});

test('factories shallow-copy definitions and preserve nested definitions and handlers', () => {
	const handler = () => assert.fail('Factory must not execute handlers.');
	const config = {
		name: 'root',
		description: 'Example',
		handler,
		params: [api.param({ name: 'id' })],
		flags: [api.flag({ name: 'enabled', type: 'boolean' })],
		commands: [api.command({ name: 'child' })]
	};
	const command = api.command(config);
	assert.notEqual(command, config);
	assert.deepEqual(command, config);
	assert.equal(command.params, config.params);
	assert.equal(command.flags, config.flags);
	assert.equal(command.commands, config.commands);
	assert.equal(command.handler, handler);
	const flag = { name: 'count', type: 'number', default: 2 };
	const param = { name: 'file', optional: true };
	assert.deepEqual(api.flag(flag), flag);
	assert.notEqual(api.flag(flag), flag);
	assert.deepEqual(api.param(param), param);
	assert.notEqual(api.param(param), param);
});

test('package exports compiled JavaScript and declarations without runtime dependencies', () => {
	const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	assert.deepEqual(manifest.files, ['dist']);
	assert.deepEqual(manifest.exports, {
		'.': { types: './dist/index.d.ts', default: './dist/index.js' }
	});
	assert.equal(manifest.types, './dist/index.d.ts');
	assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0);
});
