import type { Flag } from './types.ts';

/**
 * Parses an argument as a string, finite number or boolean.
 * Strings are unchanged; numbers use Number conversion; booleans require "true" or "false".
 * @internal Shared by argument parsing; not exposed by the package entry point.
 * @param value Raw argument text.
 * @param type Expected value type.
 * @returns The parsed value, or undefined after logging why parsing failed.
 */
export const parse = (value: string, type: Flag['type']): string | number | boolean | undefined => {
	try {
		if (type === 'string') return value;
		if (type === 'number') {
			const number = Number(value);
			if (value.trim() === '' || !Number.isFinite(number))
				throw new Error(`Invalid number: "${value}". Expected a non-empty finite number.`);
			return number;
		}
		if (value === 'true') return true;
		if (value === 'false') return false;
		throw new Error(`Invalid boolean: "${value}". Expected "true" or "false".`);
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		return undefined;
	}
};
