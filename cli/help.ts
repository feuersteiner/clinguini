import type { Command } from '../types.ts';

/** Render usage for the selected command, including its full command path. */
export const printHelp = (path: Command[]): void => {
	const command = path[path.length - 1];
	if (command.utils?.header) console.log(command.utils.header);
	const params = (command.params ?? []).map(({ name, optional }) =>
		optional ? `[${name}]` : `<${name}>`
	);
	const usage = [
		...path.map(({ name }) => name),
		...(command.commands?.length ? ['<command>'] : []),
		...params,
		...(command.flags?.length ? ['[options]'] : [])
	];
	const lines = [`Usage: ${usage.join(' ')}`];
	if (command.description) lines.push('', command.description);
	if (command.commands?.length)
		lines.push(
			'',
			'Commands:',
			...command.commands.map(
				({ name, description }) => `  ${name}${description ? `  ${description}` : ''}`
			)
		);
	if (command.flags?.length)
		lines.push(
			'',
			'Options:',
			...command.flags.map(
				({ name, shortForm, type, description }) =>
					`  ${shortForm ? `-${shortForm}, ` : ''}--${name}${type === 'boolean' ? '' : ` <${type}>`}${description ? `  ${description}` : ''}`
			)
		);
	console.log(lines.join('\n'));
};
