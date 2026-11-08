import type { Command } from './types.ts';

/** Print a command, then recursively print its children. */
export const printHelp = (
	command: Command,
	parents: string[] = [],
	inherited: Command['utils'] = {}
): void => {
	const utils = { ...inherited, ...command.utils };
	const path = [...parents, command.name];
	const flags = command.flags ?? [];
	const params = (command.params ?? []).map(({ name, optional }) =>
		optional ? `[${name}]` : `<${name}>`
	);
	console.log(
		`Usage: ${[
			...path,
			...(command.commands?.length ? ['<command>'] : []),
			...params,
			...(flags.length || utils.help || utils.verbose ? ['[options]'] : [])
		].join(' ')}`
	);
	if (command.description) console.log(command.description);
	for (const { name, shortForm, type, description } of flags)
		console.log(
			`  ${shortForm ? `-${shortForm}, ` : ''}--${name}${type === 'boolean' ? '' : ` <${type}>`}${description ? `  ${description}` : ''}`
		);
	if (utils.help) console.log('  -h, --help  Show help');
	if (utils.verbose) console.log('  -v, --verbose  Show diagnostics');
	for (const child of command.commands ?? []) printHelp(child, path, utils);
};
