import type { Clinguini, Command, Flag, Param } from './types.ts';

export type { Clinguini, Command, Flag, Param } from './types.ts';

export const clinguini: (
	args: readonly string[],
	config: Clinguini
) => Promise<void> = async () => {
	throw new Error('clinguini execution is not implemented yet.');
};

export const command = <
	const Params extends readonly Param[] = readonly [],
	const Flags extends readonly Flag[] = readonly []
>(
	config: Command<Params, Flags>
): Command<Params, Flags> => ({ ...config });

export const flag = <const Definition extends Flag>(config: Definition): Flag & Definition => ({
	...config
});

export const param = <const Definition extends Param>(config: Definition): Param & Definition => ({
	...config
});
