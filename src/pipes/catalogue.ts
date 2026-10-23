import { validateString, validateNumber } from '../internal/validation.js';
import { Quantity } from '@neutrium/quantity';
import type { Pipe } from './Pipe.js';
import { lengthQuantity } from '../validation.js';
import { PipeRangeError } from '../errors.js';
import type { PipeErrorCode } from '../errors.js';

type BoreFilter = (outerDiameter: number | Quantity, wallThickness: number, tableUnit: string, outputUnit?: string) => boolean;

/** Match a nominal designation, allowing only floating-point conversion noise. */
export function resolveSize(size: number, sizes: readonly number[], field = 'size'): number
{
	validateNumber(size, field, 'INVALID_SIZE', 'Invalid pipe size provided: size');

	if(size <= 0)
	{
		throw new PipeRangeError(
			'Invalid pipe size provided: expected a finite, positive number',
			{ code: 'INVALID_SIZE', field, value: size }
		);
	}

	return sizes.findIndex(candidate => Math.abs(candidate - size) <=
		8 * Number.EPSILON * Math.max(Math.abs(candidate), Math.abs(size)));
}

/** Identifiers are strings, never coerced object keys or numbers. */
export function validateIdentifier(value: string, field: string, code: PipeErrorCode): void
{
	validateString(value, field, code);
}

export interface PipeSearchOptions
{
	/** Inclusive lower bound, expressed as a length with units. */
	minimumInternalDiameter?: string | Quantity;
}

/** Validate query dimensions without converting Decimal values to numbers. */
export function queryLength(value: string | Quantity, name: string, allowZero = false): Quantity
{
	return lengthQuantity(value, name === "Outer diameter" ? "outerDiameter" : "minimumInternalDiameter", name, allowZero);
}

/** Table dimensions must use the same unit. Missing and sentinel values are unavailable. */
export function usableDimensions(od: number | undefined, wt: number | null | undefined): boolean
{
	return typeof od === "number" && typeof wt === "number" &&
		Number.isFinite(od) && Number.isFinite(wt) && od > 0 && wt > 0 && 2 * wt < od;
}



export function findPipes<T extends Pipe>(options: PipeSearchOptions, candidates: (matches: BoreFilter) => T[]): T[]
{
	const minimum = options.minimumInternalDiameter === undefined ? undefined :
		queryLength(options.minimumInternalDiameter, "Minimum internal diameter", true);

	// Reproduce constructor conversion and bore arithmetic in Quantity precision.
	// Avoid areas, validation, property locking and instance allocation for rejects.
	const matches: BoreFilter = (outerDiameter, wallThickness, tableUnit, outputUnit = tableUnit) => {
		if(minimum === undefined)
		{
			return true;
		}

		const od = typeof outerDiameter === 'number' ? new Quantity(outerDiameter, tableUnit).to(outputUnit) : outerDiameter;
		const wt = new Quantity(wallThickness, tableUnit).to(od.units());

		return od.sub(wt.mul(2)).gte(minimum);
	};

	return candidates(matches)
		.sort((a, b) => a.internalDiameter.compareTo(b.internalDiameter) ?? 0);
}
