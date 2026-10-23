import { lockProperties } from './internal/lockProperties.js';
export type PipeErrorCode =
	"INVALID_INPUT" | "INVALID_DIMENSION" | "INVALID_LENGTH" | "INVALID_DENSITY" | "INVALID_GEOMETRY" |
	"INVALID_SIZE" | "INVALID_SCHEDULE" | "INVALID_TYPE" | "INVALID_COMPOUND" |
	"INVALID_PRESSURE_RATING" | "INVALID_GAUGE" | "INVALID_SIZING_SYSTEM" |
	"INVALID_COMPONENT" | "INVALID_PORT" | "INVALID_ANGLE";

export interface PipeErrorDetails
{
	code: PipeErrorCode;
	field: string;
	value: unknown;
	/** Valid alternatives for the current size/standard, when applicable. */
	allowedValues?: readonly (string | number)[];
	cause?: unknown;
}

/** Structured validation error; remains an instanceof Error. */
export class PipeError extends Error
{
	readonly code: PipeErrorCode;
	readonly field: string;
	readonly value: unknown;
	readonly allowedValues: readonly (string | number)[];

	constructor(message: string, details: PipeErrorDetails)
	{
		super(message, { cause: details.cause });
		this.name = "PipeError";
		this.code = details.code;
		this.field = details.field;
		this.value = details.value;
		this.allowedValues = Object.freeze([...(details.allowedValues ?? [])]);
		lockProperties(this, ["code", "field", "value", "allowedValues"]);
	}
}

/** Structured validation error; remains an instanceof TypeError. */
export class PipeTypeError extends TypeError
{
	readonly code: PipeErrorCode;
	readonly field: string;
	readonly value: unknown;
	readonly allowedValues: readonly (string | number)[];

	constructor(message: string, details: PipeErrorDetails)
	{
		super(message, { cause: details.cause });
		this.name = "PipeTypeError";
		this.code = details.code;
		this.field = details.field;
		this.value = details.value;
		this.allowedValues = Object.freeze([...(details.allowedValues ?? [])]);
		lockProperties(this, ["code", "field", "value", "allowedValues"]);
	}
}

/** Structured validation error; remains an instanceof RangeError. */
export class PipeRangeError extends RangeError
{
	readonly code: PipeErrorCode;
	readonly field: string;
	readonly value: unknown;
	readonly allowedValues: readonly (string | number)[];

	constructor(message: string, details: PipeErrorDetails)
	{
		super(message, { cause: details.cause });
		this.name = "PipeRangeError";
		this.code = details.code;
		this.field = details.field;
		this.value = details.value;
		this.allowedValues = Object.freeze([...(details.allowedValues ?? [])]);
		lockProperties(this, ["code", "field", "value", "allowedValues"]);
	}
}

/** Narrow an unknown caught value to one of the library's structured errors. */
export function isPipeError(error: unknown): error is PipeError | PipeTypeError | PipeRangeError
{
	return error instanceof PipeError || error instanceof PipeTypeError || error instanceof PipeRangeError;
}
