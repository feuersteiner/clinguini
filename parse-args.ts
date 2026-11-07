import { parse } from './parsers.ts';
import type { Command, Flag, Handler } from './types.ts';

/** Recognizes flags while allowing a lone dash and negative numbers as values. */
const isOption = (value: string): boolean =>
	value.startsWith('-') && value !== '-' && !/^-(?:\d|\.\d)/.test(value);

/**
 * Parses flags and positional strings for one command without executing its handler.
 * Supports long names, single-letter aliases, --name=value and the -- separator.
 * Repeated flags use the last value; boolean flags take no value.
 * Failed value conversions also log their reason through the shared parser.
 * @param args Command arguments, excluding runtime, script and command names.
 * @param config Declared flags and ordered positional parameters.
 * @returns Named values matching the Handler argument shape.
 * @throws {Error} For invalid definitions, defaults, values, missing or unexpected arguments.
 */
export const parseArgs = (
	args: readonly string[],
	config: Pick<Command, 'params' | 'flags'>
): Parameters<Handler>[0] => {
	const definitions = config.flags ?? [];
	const lookup = new Map<string, Flag>();
	for (const definition of definitions) {
		const names = [`--${definition.name}`];
		if (definition.shortForm !== undefined) {
			if (!/^[a-z]$/i.test(definition.shortForm))
				throw new Error(`Invalid short form for "${definition.name}".`);
			names.push(`-${definition.shortForm}`);
		}
		for (const name of names) {
			if (lookup.has(name)) throw new Error(`Duplicate flag: "${name}".`);
			lookup.set(name, definition);
		}
	}

	const flags: Record<string, string | number | boolean | undefined> = Object.fromEntries(
		definitions.map((definition) => [
			definition.name,
			definition.type === 'boolean' ? false : undefined
		])
	);
	for (const definition of definitions) {
		if (definition.default === undefined) continue;
		const value = parse(String(definition.default), definition.type);
		if (value === undefined) throw new Error(`Invalid default for flag "--${definition.name}".`);
		flags[definition.name] = value;
	}
	const positional: string[] = [];
	for (let index = 0; index < args.length; index++) {
		const token = args[index];
		if (token === '--') {
			positional.push(...args.slice(index + 1));
			break;
		}
		if (!isOption(token)) {
			positional.push(token);
			continue;
		}
		const equals = token.indexOf('=');
		const name = equals === -1 ? token : token.slice(0, equals);
		const definition = lookup.get(name);
		if (!definition) throw new Error(`Unknown flag: "${name}".`);
		if (definition.type === 'boolean') {
			if (equals !== -1) throw new Error(`Flag "${name}" does not take a value.`);
			flags[definition.name] = true;
			continue;
		}
		let value: string;
		if (equals !== -1) value = token.slice(equals + 1);
		else {
			const next = args[index + 1];
			if (next === undefined || isOption(next))
				throw new Error(`Missing value for flag "${name}".`);
			value = next;
			index++;
		}
		const parsed = parse(value, definition.type);
		if (parsed === undefined) throw new Error(`Invalid value for flag "${name}".`);
		flags[definition.name] = parsed;
	}

	const paramDefinitions = config.params ?? [];
	const params: Record<string, string | undefined> = Object.fromEntries(
		paramDefinitions.map((definition) => [definition.name, undefined])
	);
	let position = 0;
	let optionalSeen = false;
	const paramNames = new Set<string>();
	for (const definition of paramDefinitions) {
		if (paramNames.has(definition.name)) throw new Error(`Duplicate param: "${definition.name}".`);
		paramNames.add(definition.name);
		if (optionalSeen && !definition.optional)
			throw new Error(`Required param "${definition.name}" cannot follow an optional param.`);
		optionalSeen ||= definition.optional === true;
		if (position >= positional.length && !definition.optional)
			throw new Error(`Missing required param: "${definition.name}".`);
		params[definition.name] = positional[position++];
	}
	if (position < positional.length)
		throw new Error(`Unexpected argument: "${positional[position]}".`);
	return { params, flags };
};
