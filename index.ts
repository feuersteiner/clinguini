import { resolveCommands } from './args/commands.ts';
import { parseParams } from './args/params.ts';
import { printHelp } from './help.ts';
import type { Command, Flag, Handler, Param } from './types.ts';

export type { Command, Flag, Handler, Param } from './types.ts';

/**
 * Parse arguments, show help or await the selected handler.
 * Invalid arguments default to exit code 2; handler failures set exit code 1.
 * Errors are reported without terminating the process or rejecting the promise.
 * @param config Command metadata, arguments, children and handler.
 * @param args Arguments to parse; defaults to process.argv.slice(2) at call time.
 */
export const clinguini = async (
	config: Command,
	args: readonly string[] = process.argv.slice(2)
): Promise<void> => {
	let handler: Handler;
	let values: Parameters<Handler>[0];
	let verbose: boolean;
	try {
		const scopes = resolveCommands(args, config);
		const helpIndex = scopes.findIndex((scope) => scope.help);
		const selected = helpIndex === -1 ? scopes.length - 1 : helpIndex;
		const target = scopes[selected];
		const command = target.command;
		verbose = scopes.some((scope) => scope.verbose);
		const help =
			helpIndex !== -1 ||
			(!command.handler && command.commands?.length && target.positional.length === 0);
		const params = help ? {} : parseParams(target.positional, command.params);
		if (target.utils.header) console.log(target.utils.header);
		if (help || !command.handler) {
			if (typeof target.utils.help !== 'function') {
				printHelp(
					command,
					scopes.slice(0, selected).map((scope) => scope.command.name),
					target.utils
				);
				return;
			}
			handler = target.utils.help;
		} else {
			handler = command.handler;
			if (verbose) console.error(`Running ${scopes.map((scope) => scope.command.name).join(' ')}.`);
		}
		values = { params, flags: target.flags };
	} catch (error) {
		const settings = config.utils?.argumentError;
		console.error(
			`Error: ${settings?.message ?? (error instanceof Error ? error.message : String(error))}`
		);
		process.exitCode = settings?.exitCode ?? 2;
		return;
	}
	try {
		await handler(values);
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
