import type { DeepReadonly } from '../readonly.js';
import { lockProperties, freezeDefinition } from '../internal/readonly.js';
import { validateObject, validateQuantity } from '../internal/validation.js';
import { Quantity } from '@neutrium/quantity';
import { positiveLength } from '../validation.js';
import type { PipeDefinition } from './PipeDefinition.js';
import { Port } from '../connections/Port.js';
import type { PortDetails } from '../connections/Port.js';
import { PipeTypeError, PipeRangeError } from '../errors.js';
import { TwoPortComponent } from '../components/TwoPortComponent.js';
import type { ComponentMetadata } from '../components/Component.js';

export interface PipeComponentOptions extends Omit<PortDetails, 'outerDiameter'>
{
	metadata?: ComponentMetadata;
}

/**
 * A two-port view of a shared pipe specification, without segment length or state.
 * Adopts and recursively freezes the completed pipe definition's data in place.
 */
export class PipeComponent<P extends PipeDefinition = PipeDefinition> extends TwoPortComponent
{
	readonly pipe: DeepReadonly<P>;

	constructor(pipe: P, options: PipeComponentOptions = {})
	{
		validateObject(options);
		validateObject(pipe, "pipe");

		const params = ['internalDiameter', 'internalCrossSectionalArea', 'outerDiameter', 'wallThickness', 'externalCrossSectionalArea', 'materialCrossSectionalArea'] as const;

		for(const field of params)
		{
			validateQuantity(pipe[field], field);
		}

		positiveLength(pipe.wallThickness, 'wallThickness', 'Pipe wall thickness');

		for(const field of ['internalCrossSectionalArea', 'externalCrossSectionalArea', 'materialCrossSectionalArea'] as const)
		{
			let area: Quantity;

			try
			{
				area = new Quantity(pipe[field]);
			}
			catch(cause)
			{
				throw new PipeTypeError('Pipe area must be a valid quantity', {
					code: 'INVALID_INPUT', field, value: pipe[field], cause,
				});
			}

			if(!area.isCompatible('m^2'))
			{
				throw new PipeTypeError('Pipe area must have area units', {
					code: 'INVALID_DIMENSION', field, value: pipe[field],
				});
			}

			if(!area.scalar.isFinite() || !area.gt(0))
			{
				throw new PipeRangeError('Pipe area must be finite and positive', {
					code: 'INVALID_GEOMETRY', field, value: pipe[field],
				});
			}
		}

		super({ kind: 'pipe', inlet: Port.fromPipe(pipe, options), metadata: options.metadata });
		// Adopt the completed shared definition, retaining its identity and methods.
		// Its author is responsible for consistency between all dimensions and areas.
		this.pipe = freezeDefinition(pipe, 'pipe');
		lockProperties(this, ["pipe"]);
	}
}
