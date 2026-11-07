import { parse } from '../parsers.ts';
import type { Flag } from '../types.ts';

/**
 * Recognizes flag tokens while allowing a lone dash and negative numbers as values.
 * @param token Raw argument text.
 * @returns Whether the token starts a named flag.
 */
export const isFlag = (token: string): boolean =>
	token.startsWith('-') && token !== '-' && !/^-(?:\d|\.\d)/.test(token);

/**
 * Lists a flag's long name and optional single-letter alias.
 * @param definition Flag configuration.
 * @returns Accepted names, including their leading dashes.
 * @throws {Error} If the short form is not a single letter.
 */
const flagNames = ({ name, shortForm }: Flag): string[] => {
	if (shortForm !== undefined && !/^[a-z]$/i.test(shortForm))
		throw new Error(`Invalid short form for "${name}".`);
	return [`--${name}`, ...(shortForm === undefined ? [] : [`-${shortForm}`])];
};

/**
 * Converts a configured default, or supplies false/undefined for an absent flag.
 * @param definition Flag configuration.
 * @returns The initial flag value.
 * @throws {Error} If conversion fails; the shared parser also logs the reason.
 */
const flagDefault = ({ name, type, default: fallback }: Flag) => {
	if (fallback === undefined) return type === 'boolean' ? false : undefined;
	const value = parse(String(fallback), type);
	if (value === undefined) throw new Error(`Invalid default for flag "--${name}".`);
	return value;
};

/**
 * Prepares one command's flag definitions before reading its arguments.
 * @param definitions Local flags, aliases and defaults.
 * @returns A lookup by accepted name and initial values by configured name.
 * @throws {Error} For invalid aliases, duplicate names or invalid defaults.
 */
export const prepareFlags = (definitions: Flag[] = []) => {
	const entries = definitions.flatMap((flag) =>
		flagNames(flag).map((name) => [name, flag] as const)
	);
	const lookup = entries.reduce((lookup, [name, flag]) => {
		if (lookup.has(name)) throw new Error(`Duplicate flag: "${name}".`);
		return lookup.set(name, flag);
	}, new Map<string, Flag>());
	const values: Record<string, string | number | boolean | undefined> = Object.fromEntries(
		definitions.map((flag) => [flag.name, flagDefault(flag)])
	);
	return { lookup, values };
};

/**
 * Reads one flag and its inline or following value.
 * Failed value conversions also log their reason through the shared parser.
 * @param args Raw command arguments.
 * @param index Position of the flag token.
 * @param lookup Flag definitions for the current command only.
 * @returns Its configured name, parsed value and number of consumed tokens.
 * @throws {Error} For unknown flags, missing/invalid values or values on booleans.
 */
export const readFlag = (args: readonly string[], index: number, lookup: Map<string, Flag>) => {
	const token = args[index];
	const equals = token.indexOf('=');
	const name = equals === -1 ? token : token.slice(0, equals);
	const definition = lookup.get(name);
	if (!definition) throw new Error(`Unknown flag: "${name}".`);
	if (definition.type === 'boolean') {
		if (equals !== -1) throw new Error(`Flag "${name}" does not take a value.`);
		return { name: definition.name, value: true, consumed: 1 };
	}

	const value = equals === -1 ? args[index + 1] : token.slice(equals + 1);
	if (value === undefined || (equals === -1 && isFlag(value)))
		throw new Error(`Missing value for flag "${name}".`);
	const parsed = parse(value, definition.type);
	if (parsed === undefined) throw new Error(`Invalid value for flag "${name}".`);
	return { name: definition.name, value: parsed, consumed: equals === -1 ? 2 : 1 };
};
