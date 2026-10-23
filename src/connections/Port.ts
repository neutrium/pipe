import { lockProperties } from '../internal/readonly.js';
import { verifiedPorts } from '../internal/portCache.js';
import { validateObject, validateNumber, validateString, validateQuantity } from '../internal/validation.js';
import type { Quantity } from '@neutrium/quantity';
import { lengthQuantity } from '../validation.js';
import { PipeError, PipeRangeError, PipeTypeError } from '../errors.js';
import type { NominalSize } from '../nominalSize.js';
export type { NominalSize } from '../nominalSize.js';

/** Structural port contract usable by custom component implementations. */
export interface PortDefinition
{
	/** Actual internal flow diameter at the connection. */
	readonly internalDiameter: Quantity;
	readonly outerDiameter?: Quantity;
	/** Open identifier, e.g. "flanged", "threaded", or a user-defined connection. */
	readonly connection?: string;
	readonly nominalSize?: NominalSize;
}

export interface PortOptions extends PortDetails
{
	internalDiameter: string | Quantity;
}

export interface PortDetails
{
	outerDiameter?: string | Quantity;
	connection?: string;
	nominalSize?: NominalSize;
}

/** Physical connection definition; port names belong to the containing component. */
export class Port implements PortDefinition
{
	readonly internalDiameter: Quantity;
	readonly outerDiameter?: Quantity;
	readonly connection?: string;
	readonly nominalSize?: NominalSize;

	constructor(options: PortOptions)
	{
		validateObject(options);

		// Read each input once, then validate the exact values retained by this port.
		if('diameter' in options)
		{
			throw new PipeTypeError("The diameter option has been removed; use internalDiameter", {
				code: "INVALID_PORT", field: "diameter", value: options.diameter,
			});
		}

		const { internalDiameter, outerDiameter, connection, nominalSize } = options;
		this.internalDiameter = lengthQuantity(internalDiameter, "internalDiameter", "Port internal diameter");

		if(outerDiameter !== undefined)
		{
			this.outerDiameter = lengthQuantity(outerDiameter, "outerDiameter", "Port outer diameter");

			if(this.outerDiameter.lt(this.internalDiameter))
			{
				throw new PipeRangeError("Port outer diameter must not be less than its flow diameter", {
					code: "INVALID_PORT", field: "outerDiameter", value: outerDiameter,
				});
			}
		}

		if(connection !== undefined && (typeof connection !== "string" || !connection.trim()))
		{
			throw new PipeTypeError("Port connection must be a non-empty string", {
				code: "INVALID_PORT", field: "connection", value: connection,
			});
		}

		this.connection = connection;

		if(nominalSize !== undefined)
		{
			const nominal = nominalSize;
			validateObject(nominal, "nominalSize", "INVALID_PORT");
			const { system, value: nominalValue } = nominal;
			validateString(system, "nominalSize.system", "INVALID_PORT");
			const systems = ["DN", "NPS", "ASTM_B88", "ASTM_B88M"];

			if(!systems.includes(system))
			{
				throw new PipeError("Unsupported nominal sizing system", {
					code: "INVALID_PORT", field: "nominalSize.system", value: system, allowedValues: systems,
				});
			}

			validateNumber(nominalValue, "nominalSize.value", "INVALID_PORT");

			if(nominalValue <= 0)
			{
				throw new PipeRangeError(
					"Nominal size must be positive",
					{ code: "INVALID_PORT", field: "nominalSize.value", value: nominalValue }
				);
			}

			this.nominalSize = Object.freeze({ system, value: nominalValue });
		}

		lockProperties(this, ["internalDiameter", "outerDiameter", "connection", "nominalSize"]);

		// Canonical fields are locked and nominalSize is copied and frozen.
		// Subclasses may introduce custom accessors and must be checked on attachment.
		if(new.target === Port)
		{
			verifiedPorts.set(this, this);
		}
	}

	/** Use actual pipe dimensions; nominal designations must be supplied explicitly. */
	static fromPipe(pipe: Pick<PortDefinition, "internalDiameter" | "outerDiameter">, options: Omit<PortDetails, "outerDiameter"> = {}): Port
	{
		validateObject(options);
		validateObject(pipe, "pipe");
		const { internalDiameter, outerDiameter } = pipe;
		validateQuantity(internalDiameter, "internalDiameter");

		if(outerDiameter !== undefined)
		{
			validateQuantity(outerDiameter, "outerDiameter");
		}

		return new Port({ ...options, internalDiameter, outerDiameter });
	}
}
