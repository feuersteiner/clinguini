import type { Clinguini, Command, Flag, Param } from './types.ts';

export type { Clinguini, Command, Flag, Param } from './types.ts';

export const clinguini: (
	args: readonly string[],
	config: Clinguini
) => Promise<void> = async () => {
	throw new Error('clinguini execution is not implemented yet.');
};

export const command = (config: Command): Command => ({ ...config });

export const flag = (config: Flag): Flag => ({ ...config });

export const param = (config: Param): Param => ({ ...config });
