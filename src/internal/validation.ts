import { isQuantity } from '@neutrium/quantity/guards.js';
import type { Quantity } from '@neutrium/quantity';
import { PipeError, PipeTypeError, PipeRangeError, isPipeError } from '../errors.js';
import type { PipeErrorCode } from '../errors.js';

/** Accept structural objects (including class instances), but not arrays or scalar containers. */
export function validateObject(value: unknown, field = 'options', code: PipeErrorCode = 'INVALID_INPUT'): void
{
	if(value === null || typeof value !== 'object' || Object.prototype.toString.call(value) !== '[object Object]')
	{
		throw new PipeTypeError(field + ' must be an object', { code, field, value });
	}
}

export function validateString(value: unknown, field: string, code: PipeErrorCode = 'INVALID_INPUT'): asserts value is string
{
	if(typeof value !== 'string' || !value.trim())
	{
		throw new PipeTypeError(field + ' must be a non-empty string', { code, field, value });
	}
}

export function validateNumber(value: unknown, field: string, code: PipeErrorCode = 'INVALID_INPUT', label = field): asserts value is number
{
	if(typeof value !== 'number')
	{
		throw new PipeTypeError(label + ' must be a number', { code, field, value });
	}

	if(!Number.isFinite(value))
	{
		throw new PipeRangeError(label + ' must be finite', { code, field, value });
	}
}

export function validateQuantity(value: unknown, field: string, code: PipeErrorCode = 'INVALID_INPUT'): asserts value is Quantity
{
	if(!isQuantity(value))
	{
		throw new PipeTypeError(field + ' must be a Quantity', { code, field, value });
	}
}

/** Retain error classification and parser causes while identifying a nested definition. */
export function atField<T>(prefix: string, action: () => T): T
{
	try
	{
		return action();
	}
	catch(error)
	{
		if(!isPipeError(error))
		{
			throw error;
		}

		const ErrorClass = error instanceof PipeTypeError ? PipeTypeError : error instanceof PipeRangeError ? PipeRangeError : PipeError;

		throw new ErrorClass(error.message, {
			code: error.code, field: prefix + '.' + error.field, value: error.value,
			allowedValues: error.allowedValues, cause: error.cause,
		});
	}
}
