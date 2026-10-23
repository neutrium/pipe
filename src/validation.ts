import { Quantity } from '@neutrium/quantity';
import { isQuantity } from '@neutrium/quantity/guards.js';
import { validateNumber } from './internal/validation.js';
import { PipeTypeError, PipeRangeError } from './errors.js';
import type { PipeErrorCode } from './errors.js';

/** Parse and validate a length. Prefer the named positive/non-negative wrappers in extensions. */
export function lengthQuantity(value: string | Quantity, field = "length", label = field, allowZero = false): Quantity
{
	return dimensionalQuantity(value, field, label, "m", "length", "length", "INVALID_LENGTH", allowZero);
}

/** Return a fresh Quantity with the input units, requiring a finite, positive length. */
export function positiveLength(value: string | Quantity, field = "length", label = field): Quantity
{
	return lengthQuantity(value, field, label);
}

/** As positiveLength, but zero is permitted (e.g. segment length or absolute roughness). */
export function nonNegativeLength(value: string | Quantity, field = "length", label = field): Quantity
{
	return lengthQuantity(value, field, label, true);
}

/** Validate a finite JavaScript number without coercion; negative values and zero are allowed. */
export function finiteNumber(value: number, field = "value", label = field): number
{
	validateNumber(value, field, 'INVALID_INPUT', label);
	return value;
}

export function densityQuantity(value: string | Quantity): Quantity
{
	return dimensionalQuantity(value, "density", "Material density", "kg/m^3", "density", "mass per volume", "INVALID_DENSITY", false);
}

function dimensionalQuantity(
	value: string | Quantity, field: string, label: string, dimension: string,
	kind: string, unitKind: string, rangeCode: PipeErrorCode, allowZero: boolean,
): Quantity
{
	if(typeof value !== 'string' && !isQuantity(value))
		throw new PipeTypeError(label + ' must be a string or Quantity', { code: 'INVALID_INPUT', field, value });
	let quantity: Quantity;

	try
	{
		quantity = new Quantity(value);
	}
	catch(cause)
	{
		throw new PipeTypeError(label + " must be a valid " + kind, {
			code: "INVALID_INPUT", field, value, cause,
		});
	}

	if(!quantity.isCompatible(dimension))
	{
		throw new PipeTypeError(label + " must have " + unitKind + " units", {
			code: "INVALID_DIMENSION", field, value,
		});
	}

	if(!quantity.scalar.isFinite() || (allowZero ? quantity.lt(0) : !quantity.gt(0)))
	{
		throw new PipeRangeError(label + " must be a finite, " + (allowZero ? "non-negative" : "positive") + " " + kind, {
			code: rangeCode, field, value,
		});
	}

	return quantity;
}
