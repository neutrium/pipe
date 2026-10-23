import type { Quantity } from '@neutrium/quantity';

/** Read-only data graph; Quantity arithmetic and custom methods remain callable. */
export type DeepReadonly<T> = T extends Quantity | ((...args: never[]) => unknown) ? T :
	T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
