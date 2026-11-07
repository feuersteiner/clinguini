/**
 * Preserves a string argument exactly, including whitespace and empty strings.
 * @param value Raw argument text.
 * @returns The original string.
 */
export const parseString = (value: string): string => value;

/**
 * Parses a finite number using JavaScript's Number conversion.
 * Surrounding whitespace, scientific notation and numeric prefixes are accepted.
 * @param value Raw argument text.
 * @returns The parsed finite number.
 * @throws {Error} If the input is blank, invalid or converts to a non-finite number.
 */
export const parseNumber = (value: string): number => {
	const number = Number(value);
	if (value.trim() === '' || !Number.isFinite(number))
		throw new Error(`Invalid number: "${value}".`);
	return number;
};

/**
 * Parses only the exact, case-sensitive strings "true" and "false".
 * @param value Raw argument text; whitespace is not trimmed.
 * @returns The corresponding boolean.
 * @throws {Error} If the input is neither "true" nor "false".
 */
export const parseBoolean = (value: string): boolean => {
	if (value === 'true') return true;
	if (value === 'false') return false;
	throw new Error(`Invalid boolean: "${value}".`);
};
