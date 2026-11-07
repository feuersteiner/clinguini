import type { Clinguini, Command, Flag, Param } from './types.ts';

export type { Clinguini, Command, Flag, Param } from './types.ts';

export const clinguini: (
	args: readonly string[],
	config: Clinguini
) => Promise<void> = async () => {
	throw new Error('clinguini execution is not implemented yet.');
};

export const command = <const T extends Command>(config: T): T => config;

export const flag = <const T extends Flag>(config: T): T => config;

export const param = <const T extends Param>(config: T): T => config;
