import type { ParamShape } from './types.ts';

export const param = <const Shape extends ParamShape>(shape: Shape): Shape => shape;
