import { lockProperties } from '../internal/readonly.js';
import { validateObject, validateNumber } from '../internal/validation.js';
import type { Quantity } from '@neutrium/quantity';
import { TwoPortComponent } from '../components/TwoPortComponent.js';
import type { ComponentMetadata } from '../components/Component.js';
import type { PortDefinition } from '../connections/Port.js';
import { lengthQuantity } from '../validation.js';
import { PipeRangeError } from '../errors.js';

export interface ElbowOptions
{
	port: PortDefinition;
	/** Change in direction in degrees, greater than zero and at most 180. Defaults to 90. */
	angle?: number;
	/** Centreline bend radius; omitted when unknown. */
	bendRadius?: string | Quantity;
	metadata?: ComponentMetadata;
}

export class Elbow extends TwoPortComponent
{
	readonly angle: number;
	readonly bendRadius?: Quantity;

	constructor(options: ElbowOptions)
	{
		validateObject(options);
		const { port, angle = 90, bendRadius, metadata } = options;
		validateNumber(angle, "angle", "INVALID_ANGLE");

		if(angle <= 0 || angle > 180)
		{
			throw new PipeRangeError("Elbow angle must be greater than zero and at most 180 degrees", {
				code: "INVALID_ANGLE", field: "angle", value: angle,
			});
		}

		const radius = bendRadius === undefined ? undefined : lengthQuantity(bendRadius, "bendRadius", "Bend radius");
		super({ kind: "elbow", inlet: port, metadata });
		this.angle = angle;
		this.bendRadius = radius;
		lockProperties(this, ["angle", "bendRadius"]);
	}
}
