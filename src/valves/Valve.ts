import { lockProperties } from '../internal/readonly.js';
import { validateObject } from '../internal/validation.js';
import type { Quantity } from '@neutrium/quantity';
import { TwoPortComponent } from '../components/TwoPortComponent.js';
import type { ComponentMetadata } from '../components/Component.js';
import type { PortDefinition } from '../connections/Port.js';
import { lengthQuantity } from '../validation.js';
import { PipeTypeError } from '../errors.js';

export interface ValveOptions
{
	/** Open identifier, such as "ball", "gate", "globe", or a custom valve type. */
	valveType: string;
	inlet: PortDefinition;
	outlet?: PortDefinition;
	/** Internal valve bore, distinct from connection dimensions; omitted when unknown. */
	boreDiameter?: string | Quantity;
	faceToFaceLength?: string | Quantity;
	metadata?: ComponentMetadata;
}

/** Physical valve specification. Opening and control state belong to an installed hydraulic instance. */
export class Valve extends TwoPortComponent
{
	readonly valveType: string;
	readonly boreDiameter?: Quantity;
	readonly faceToFaceLength?: Quantity;

	constructor(options: ValveOptions)
	{
		validateObject(options);

		const { valveType, inlet, outlet, boreDiameter, faceToFaceLength, metadata } = options;

		if(typeof valveType !== "string" || !valveType.trim())
		{
			throw new PipeTypeError("Valve type must be a non-empty string", {
				code: "INVALID_COMPONENT", field: "valveType", value: valveType,
			});
		}

		const bore = boreDiameter === undefined ? undefined : lengthQuantity(boreDiameter, "boreDiameter", "Valve bore diameter");
		const length = faceToFaceLength === undefined ? undefined : lengthQuantity(faceToFaceLength, "faceToFaceLength", "Valve face-to-face length");
		super({ kind: "valve", inlet, outlet, metadata });
		this.valveType = valveType;
		this.boreDiameter = bore;
		this.faceToFaceLength = length;
		lockProperties(this, ["valveType", "boreDiameter", "faceToFaceLength"]);
	}
}
