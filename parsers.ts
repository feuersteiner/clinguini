export const parseString = (value: string): string => value;

export const parseNumber = (value: string): number => {
	const number = Number(value);
	if (value.trim() === '' || !Number.isFinite(number))
		throw new Error(`Invalid number: "${value}".`);
	return number;
};

export const parseBoolean = (value: string): boolean => {
	if (value === 'true') return true;
	if (value === 'false') return false;
	throw new Error(`Invalid boolean: "${value}".`);
};
