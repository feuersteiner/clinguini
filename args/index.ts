import type { Command, Handler } from '../types.ts';
import { parseFlags } from './flags.ts';
import { parseParams } from './params.ts';

/**
 * Parses one command's flags and positional strings without executing its handler.
 * Failed value conversions also log their reason through the shared parser.
 * @param args Command arguments, excluding runtime, script and command names.
 * @param config Declared flags and ordered positional parameters.
 * @returns Named values matching the Handler argument shape.
 * @throws {Error} For invalid definitions, values, missing or unexpected arguments.
 */
export const parseArgs = (
	args: readonly string[],
	config: Pick<Command, 'params' | 'flags'>
): Parameters<Handler>[0] => {
	const { flags, positional } = parseFlags(args, config.flags);
	return { flags, params: parseParams(positional, config.params) };
};
