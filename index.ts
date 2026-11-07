import type { Command, Flag, Param } from './types.ts';

export type { Command, Flag, Handler, Param } from './types.ts';

export const clinguini: (args: readonly string[], config: Command) => Promise<void> = async () => {
	throw new Error('clinguini execution is not implemented yet.');
};

export const command = (config: Command): Command => ({ ...config });

export const flag = <const Definition extends Flag>(config: Definition): Flag & Definition => ({
	...config
});

export const param = <const Definition extends Param>(config: Definition): Param & Definition => ({
	...config
});
