import type { FlagShape } from './types.ts';

export const flag = <const Shape extends FlagShape>(shape: Shape): Shape => shape;
