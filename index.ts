import { resolveCommands } from './args/commands.ts';
import { parseParams } from './args/params.ts';
import { printHelp } from './help.ts';
import type { Command, Flag, Handler, Param } from './types.ts';

export type { Command, Flag, Handler, Param } from './types.ts';

/**
 * Parse arguments, show help or await the selected handler.
 * Invalid arguments set exit code 2; handler failures set exit code 1.
 * Errors are reported without terminating the process or rejecting the promise.
 */
export const clinguini = async (args: readonly string[], config: Command): Promise<void> => {
	let command: Command;
	let values: Parameters<Handler>[0];
	let verbose: boolean;
	try {
		const scopes = resolveCommands(args, config);
		const helpIndex = scopes.findIndex((scope) => scope.help);
		const selected = helpIndex === -1 ? scopes.length - 1 : helpIndex;
		const target = scopes[selected];
		command = target.command;
		verbose = scopes.some((scope) => scope.verbose);
		const help =
			helpIndex !== -1 ||
			(!command.handler && command.commands?.length && target.positional.length === 0);
		const params = help ? {} : parseParams(target.positional, command.params);
		if (target.utils.header) console.log(target.utils.header);
		if (help || !command.handler) {
			printHelp(
				command,
				scopes.slice(0, selected).map((scope) => scope.command.name),
				target.utils
			);
			return;
		}
		values = { params, flags: target.flags };
		if (verbose) console.error(`Running ${scopes.map((scope) => scope.command.name).join(' ')}.`);
	} catch (error) {
		console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
		process.exitCode = 2;
		return;
	}
	try {
		await command.handler?.(values);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(
			verbose && error instanceof Error ? (error.stack ?? `Error: ${message}`) : `Error: ${message}`
		);
		process.exitCode = 1;
	}
};

/**
 * Defines a command without executing its handler or validating its configuration.
 * @param config Command metadata, arguments, children and handler.
 * @returns A shallow copy; nested arrays and objects remain shared.
 */
export const command = (config: Command): Command => ({ ...config });

/**
 * Defines a named flag while preserving its inferred literal types.
 * @param config Flag configuration; defaults are not parsed or validated here.
 * @returns A shallow copy of the configuration.
 */
export const flag = <const Definition extends Flag>(config: Definition): Flag & Definition => ({
	...config
});

/**
 * Defines a positional string parameter while preserving its inferred literal types.
 * @param config Parameter configuration; required unless marked optional.
 * @returns A shallow copy without parsing or validating arguments.
 */
export const param = <const Definition extends Param>(config: Definition): Param & Definition => ({
	...config
});
