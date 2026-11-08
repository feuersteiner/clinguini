import { resolveCommands } from '../args/commands.ts';
import { parseParams } from '../args/params.ts';
import type { Command, Handler } from '../types.ts';
import { prepareConfig } from './config.ts';
import { printHelp } from './help.ts';

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
		const scopes = resolveCommands(args, prepareConfig(config));
		const target = scopes[scopes.length - 1];
		command = target.command;
		verbose = scopes.some((scope) => scope.command.utils?.verbose && scope.flags.verbose === true);
		const helpIndex = scopes.findIndex(
			(scope) => scope.command.utils?.help && scope.flags.help === true
		);
		if (helpIndex !== -1) {
			const path = scopes.slice(0, helpIndex + 1).map((scope) => scope.command);
			printHelp(path);
			return;
		}
		if (!command.handler && command.commands?.length && target.positional.length === 0) {
			printHelp(scopes.map((scope) => scope.command));
			return;
		}
		const params = parseParams(target.positional, command.params);
		const flags = { ...target.flags };
		if (command.utils?.help) delete flags.help;
		if (command.utils?.verbose) delete flags.verbose;
		values = { params, flags };
		if (!command.handler) {
			printHelp(scopes.map((scope) => scope.command));
			return;
		}
		if (command.utils?.header) console.log(command.utils.header);
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
