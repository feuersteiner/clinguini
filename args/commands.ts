import type { Command } from '../types.ts';
import { isFlag, prepareFlags, readFlag } from './flags.ts';

/**
 * Starts a command scope with its own flag definitions, defaults and positional values.
 * @param command Command being selected.
 * @returns The scope used while reading that command's arguments.
 * @throws {Error} For invalid flag definitions or defaults.
 */
const createScope = (command: Command) => {
	const { lookup, values } = prepareFlags(command.flags);
	return { command, lookup, flags: values, positional: [] as string[] };
};

/**
 * Matches a child command before falling back to a positional parameter.
 * @param name Bare argument that could select a child.
 * @param parent Current command's definition.
 * @returns The matching child, or undefined when positional parsing should start.
 * @throws {Error} For duplicate matches or unknown names in groups without params.
 */
const findChild = (name: string, parent: Command) => {
	const matches = parent.commands?.filter((command) => command.name === name) ?? [];
	if (matches.length > 1) throw new Error(`Duplicate command: "${name}".`);
	if (matches.length === 1) return matches[0];
	if (parent.commands?.length && !parent.params?.length)
		throw new Error(`Unknown command: "${name}".`);
	return undefined;
};

/**
 * Walks the command tree, reading each flag once in its declaring scope.
 * @param args CLI arguments after the executable name.
 * @param config Root command and its recursive child definitions.
 * @returns Root-to-target scopes containing local flag values and positional strings.
 * @throws {Error} For invalid commands, flag definitions or flag values.
 */
export const resolveCommands = (args: readonly string[], config: Command) => {
	let skipNext = false;
	let positionalStarted = false;
	let optionsEnded = false;
	return args.reduce(
		(scopes, token, index) => {
			if (skipNext) {
				skipNext = false;
				return scopes;
			}
			const current = scopes[scopes.length - 1];
			if (token === '--' && !optionsEnded) {
				positionalStarted = true;
				optionsEnded = true;
				return scopes;
			}
			if (!optionsEnded && isFlag(token)) {
				const { name, value, consumed } = readFlag(args, index, current.lookup);
				current.flags[name] = value;
				skipNext = consumed === 2;
				return scopes;
			}

			const child = positionalStarted ? undefined : findChild(token, current.command);
			if (child) return [...scopes, createScope(child)];
			positionalStarted = true;
			current.positional.push(token);
			return scopes;
		},
		[createScope(config)]
	);
};
