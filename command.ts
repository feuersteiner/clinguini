import type { CommandShape } from './types.ts';

export const command = <const Shape extends CommandShape>(shape: Shape): Shape => shape;
