import type { Command } from '../types.ts';
import { resolveCommands } from './commands.ts';
import { parseFlags } from './flags.ts';
import { parseParams } from './params.ts';

/**
 * Resolves a command tree and parses each scope without executing handlers.
 * Subcommands win over params until -- or the first positional value stops descent.
 * Parent flags must appear before the next subcommand; flags are not inherited.
 * Failed value conversions also log their reason through the shared parser.
 * @param args CLI arguments, excluding runtime and script paths.
 * @param config Root command configuration, including recursive subcommands.
 * @returns The root-to-target path with local flags and the target's named params.
 * The last entry identifies the selected command; ancestor params are not required.
 * @throws {Error} For invalid definitions, values, missing or unexpected arguments.
 */
export const parseArgs = (args: readonly string[], config: Command) => {
	const commands = resolveCommands(args, config);
	return commands.map(({ command, args }, index) => {
		const { flags, positional } = parseFlags(args, command.flags);
		const params = parseParams(positional, index === commands.length - 1 ? command.params : []);
		return { command, params, flags };
	});
};
