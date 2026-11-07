import type { Command } from '../types.ts';
import { optionPattern } from './flags.ts';

/**
 * Splits arguments into command scopes, preferring declared children over params.
 * Flag values stay in their scope; -- or the first positional value stops descent.
 * @param args Arguments after the executable name.
 * @param config Root command and its recursive child definitions.
 * @returns The root-to-target path with each command's local argument tokens.
 * @throws {Error} For unknown subcommands or ambiguous duplicate command names.
 */
export const resolveCommands = (args: readonly string[], config: Command) => {
	let positionalStarted = false;
	let valueIndex = -1;
	return args.reduce(
		(commands, token, index) => {
			const current = commands[commands.length - 1];
			if (positionalStarted || index === valueIndex) {
				current.args.push(token);
				return commands;
			}
			if (token === '--') {
				positionalStarted = true;
				current.args.push(token);
				return commands;
			}
			if (optionPattern.test(token)) {
				const name = token.split('=')[0];
				const flag = current.command.flags?.find(
					(flag) =>
						name === `--${flag.name}` ||
						(flag.shortForm !== undefined && name === `-${flag.shortForm}`)
				);
				if (flag && flag.type !== 'boolean' && !token.includes('=')) valueIndex = index + 1;
				current.args.push(token);
				return commands;
			}

			const children = current.command.commands?.filter((command) => command.name === token) ?? [];
			if (children.length > 1) throw new Error(`Duplicate command: "${token}".`);
			if (children.length === 1) return [...commands, { command: children[0], args: [] }];
			if (current.command.commands?.length && !current.command.params?.length)
				throw new Error(`Unknown command: "${token}".`);
			positionalStarted = true;
			current.args.push(token);
			return commands;
		},
		[{ command: config, args: [] as string[] }]
	);
};
