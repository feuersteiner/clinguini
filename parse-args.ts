import { parseBoolean, parseNumber, parseString } from './parsers.ts';
import type { Command, Flag, Param, ParsedArgs } from './types.ts';

const isOption = (value: string): boolean =>
	value.startsWith('-') && value !== '-' && !/^-(?:\d|\.\d)/.test(value);

export const parseArgs = <
	const Params extends readonly Param[] = readonly [],
	const Flags extends readonly Flag[] = readonly []
>(
	args: readonly string[],
	config: Pick<Command<Params, Flags>, 'params' | 'flags'>
): ParsedArgs<Params, Flags> => {
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
			definition.type === 'boolean' ? false : definition.default
		])
	);
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
			flags[definition.name] = parseBoolean('true');
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
		flags[definition.name] = definition.type === 'number' ? parseNumber(value) : parseString(value);
	}

	const paramDefinitions = config.params ?? [];
	const params: Record<string, string | string[] | undefined> = Object.fromEntries(
		paramDefinitions.map((definition) => [definition.name, undefined])
	);
	let position = 0;
	let optionalSeen = false;
	const paramNames = new Set<string>();
	for (const [index, definition] of paramDefinitions.entries()) {
		if (paramNames.has(definition.name)) throw new Error(`Duplicate param: "${definition.name}".`);
		paramNames.add(definition.name);
		if (definition.variadic && index !== paramDefinitions.length - 1)
			throw new Error(`Variadic param "${definition.name}" must be last.`);
		if (optionalSeen && !definition.optional)
			throw new Error(`Required param "${definition.name}" cannot follow an optional param.`);
		optionalSeen ||= definition.optional === true;
		if (position >= positional.length && !definition.optional)
			throw new Error(`Missing required param: "${definition.name}".`);
		if (definition.variadic) {
			params[definition.name] = positional.slice(position).map(parseString);
			position = positional.length;
		} else {
			const value = positional[position++];
			params[definition.name] = value === undefined ? undefined : parseString(value);
		}
	}
	if (position < positional.length)
		throw new Error(`Unexpected argument: "${positional[position]}".`);
	return { params, flags } as ParsedArgs<Params, Flags>;
};
