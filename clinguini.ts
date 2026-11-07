import type { ClinguiniShape } from './types.ts';

export const clinguini: (
	args: readonly string[],
	shape: ClinguiniShape
) => Promise<void> = async () => {
	throw new Error('clinguini execution is not implemented yet.');
};
