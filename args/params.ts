import type { Param } from '../types.ts';

/**
 * Assigns positional strings to their declared names.
 * @internal Used only by the argument parser.
 * @param values Positional arguments after flag parsing.
 * @param definitions Ordered parameters; required parameters must precede optional ones.
 * @returns Values keyed by parameter name; omitted optional values are undefined.
 * @throws {Error} For duplicate names, invalid ordering, missing or extra arguments.
 */
export const parseParams = (
	values: readonly string[],
	definitions: Param[] = []
): Record<string, string | undefined> => {
	const names = new Set<string>();
	const firstOptional = definitions.findIndex((definition) => definition.optional);
	const params = Object.fromEntries(
		definitions.map((definition, index) => {
			const { name, optional } = definition;
			if (names.has(name)) throw new Error(`Duplicate param: "${name}".`);
			names.add(name);
			if (firstOptional !== -1 && index > firstOptional && !optional)
				throw new Error(`Required param "${name}" cannot follow an optional param.`);
			if (values[index] === undefined && !optional)
				throw new Error(`Missing required param: "${name}".`);
			return [name, values[index]];
		})
	);
	if (values.length > definitions.length)
		throw new Error(`Unexpected argument: "${values[definitions.length]}".`);
	return params;
};
