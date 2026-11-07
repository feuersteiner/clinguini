import { parse } from '../parsers.ts';
import type { Flag } from '../types.ts';

/** A lone dash and negative numbers are values; other leading dashes start flags. */
export const optionPattern = /^-(?!$|\d|\.\d)/;

/**
 * Parses named flags and collects positional values, honoring the -- separator.
 * Failed value conversions also log their reason through the shared parser.
 * @param args Raw command arguments.
 * @param definitions Flag types, aliases and defaults; repeated flags use the last value.
 * @returns Parsed flags and the remaining positional strings, in order.
 * @throws {Error} For invalid aliases, duplicate flags, unknown flags or invalid values/defaults.
 */
export const parseFlags = (args: readonly string[], definitions: Flag[] = []) => {
	const lookup = definitions
		.flatMap((definition) => {
			const { name, shortForm } = definition;
			if (shortForm !== undefined && !/^[a-z]$/i.test(shortForm))
				throw new Error(`Invalid short form for "${name}".`);
			return [`--${name}`, shortForm === undefined ? undefined : `-${shortForm}`]
				.filter((name) => name !== undefined)
				.map((name) => [name, definition] as const);
		})
		.reduce((lookup, [name, definition]) => {
			if (lookup.has(name)) throw new Error(`Duplicate flag: "${name}".`);
			return lookup.set(name, definition);
		}, new Map<string, Flag>());

	const flags: Record<string, string | number | boolean | undefined> = Object.fromEntries(
		definitions.map((definition) => {
			const { name, type, default: fallback } = definition;
			if (fallback === undefined) return [name, type === 'boolean' ? false : undefined];
			const value = parse(String(fallback), type);
			if (value === undefined) throw new Error(`Invalid default for flag "--${name}".`);
			return [name, value];
		})
	);

	let valueIndex = -1;
	let optionsEnded = false;
	const positional = args.flatMap((token, index) => {
		if (index === valueIndex) return [];
		if (optionsEnded) return [token];
		if (token === '--') {
			optionsEnded = true;
			return [];
		}
		if (!optionPattern.test(token)) return [token];

		const equals = token.indexOf('=');
		const name = equals === -1 ? token : token.slice(0, equals);
		const definition = lookup.get(name);
		if (!definition) throw new Error(`Unknown flag: "${name}".`);
		if (definition.type === 'boolean') {
			if (equals !== -1) throw new Error(`Flag "${name}" does not take a value.`);
			flags[definition.name] = true;
			return [];
		}

		const value = equals === -1 ? args[index + 1] : token.slice(equals + 1);
		if (value === undefined || (equals === -1 && optionPattern.test(value)))
			throw new Error(`Missing value for flag "${name}".`);
		if (equals === -1) valueIndex = index + 1;
		const parsed = parse(value, definition.type);
		if (parsed === undefined) throw new Error(`Invalid value for flag "${name}".`);
		flags[definition.name] = parsed;
		return [];
	});
	return { flags, positional };
};
