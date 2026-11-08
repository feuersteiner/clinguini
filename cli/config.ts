import type { Command, Flag } from '../types.ts';

/** Copy the command tree, inheriting utilities and declaring their local flags. */
export const prepareConfig = (command: Command, inherited: Command['utils'] = {}): Command => {
	const utils = { ...inherited, ...command.utils };
	const flags: Flag[] = [...(command.flags ?? [])];
	if (utils.help)
		flags.push({ name: 'help', shortForm: 'h', type: 'boolean', description: 'Show help' });
	if (utils.verbose)
		flags.push({
			name: 'verbose',
			shortForm: 'v',
			type: 'boolean',
			description: 'Show diagnostics'
		});
	return {
		...command,
		utils,
		flags,
		commands: command.commands?.map((child) => prepareConfig(child, utils))
	};
};
