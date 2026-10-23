import { lockProperties } from '../internal/readonly.js';
import { validateObject, validateString } from '../internal/validation.js';
import { validatePortDefinition } from '../internal/ports.js';
import type { Quantity } from '@neutrium/quantity';
import { TwoPortComponent } from '../components/TwoPortComponent.js';
import type { ComponentMetadata } from '../components/Component.js';
import type { PortDefinition } from '../connections/Port.js';
import { lengthQuantity } from '../validation.js';
import { PipeError, PipeRangeError } from '../errors.js';

export interface ReducerOptions
{
	inlet: PortDefinition;
	outlet: PortDefinition;
	style?: "concentric" | "eccentric";
	length?: string | Quantity;
	metadata?: ComponentMetadata;
}

/** Port labels allow either flow direction, including expansion through a reducer. */
export class Reducer extends TwoPortComponent
{
	readonly style: "concentric" | "eccentric";
	readonly length?: Quantity;

	constructor(options: ReducerOptions)
	{
		validateObject(options);
		const { inlet, outlet, style = "concentric", length, metadata } = options;
		validateString(style, "style", "INVALID_COMPONENT");

		if(style !== "concentric" && style !== "eccentric")
		{
			throw new PipeError("Reducer style must be concentric or eccentric", {
				code: "INVALID_COMPONENT", field: "style", value: style, allowedValues: ["concentric", "eccentric"],
			});
		}

		const inletPort = validatePortDefinition(inlet, 'ports.inlet');
		const outletPort = validatePortDefinition(outlet, 'ports.outlet');

		if(inletPort.internalDiameter.eq(outletPort.internalDiameter))
		{
			throw new PipeRangeError("Reducer ports must have different flow diameters", {
				code: "INVALID_GEOMETRY", field: "ports.outlet", value: outlet,
			});
		}

		const parsedLength = length === undefined ? undefined : lengthQuantity(length, "length", "Reducer length");
		super({ kind: "reducer", inlet, outlet, metadata });
		this.style = style;
		this.length = parsedLength;
		lockProperties(this, ["style", "length"]);
	}
}
