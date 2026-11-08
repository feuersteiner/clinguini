import type { Command, Flag, Param } from './types.ts';

export type { Command, Flag, Handler, Param } from './types.ts';
export { clinguini } from './cli/index.ts';

/**
 * Defines a command without executing its handler or validating its configuration.
 * @param config Command metadata, arguments, children and handler.
 * @returns A shallow copy; nested arrays and objects remain shared.
 */
export const command = (config: Command): Command => ({ ...config });

/**
 * Defines a named flag while preserving its inferred literal types.
 * @param config Flag configuration; defaults are not parsed or validated here.
 * @returns A shallow copy of the configuration.
 */
export const flag = <const Definition extends Flag>(config: Definition): Flag & Definition => ({
	...config
});

/**
 * Defines a positional string parameter while preserving its inferred literal types.
 * @param config Parameter configuration; required unless marked optional.
 * @returns A shallow copy without parsing or validating arguments.
 */
export const param = <const Definition extends Param>(config: Definition): Param & Definition => ({
	...config
});
