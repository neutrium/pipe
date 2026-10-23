import { Port } from '../connections/Port.js';
import { isQuantity } from '@neutrium/quantity/guards.js';
import type { PortDefinition } from '../connections/Port.js';
import { PipeTypeError } from '../errors.js';
import { atField, validateObject, validateQuantity } from './validation.js';
import { verifiedPorts } from './portCache.js';

/** Validate shared definitions without adopting or freezing caller-owned data. */
export function validatePortDefinition(port: PortDefinition, field: string): PortDefinition
{
	if(!port || typeof port !== 'object')
	{
		throw new PipeTypeError(
			'Component ports require port definitions',
			{ code: 'INVALID_PORT', field, value: port }
		);
	}

	const verified = verifiedPorts.get(port);

	if(verified)
	{
		return verified;
	}

	validateObject(port, field, 'INVALID_PORT');

	return atField(field, () => {
		validateQuantity(port.internalDiameter, 'internalDiameter', 'INVALID_PORT');

		if(port.outerDiameter !== undefined)
		{
			validateQuantity(port.outerDiameter, 'outerDiameter', 'INVALID_PORT');
		}

		return new Port(port);
	});
}

/** Cache only validated own data fields after successful adoption, never custom getters. */
export function rememberFrozenPort(port: PortDefinition, validated: PortDefinition): void
{
	if(verifiedPorts.has(port) || !Object.isFrozen(port))
	{
		return;
	}

	const stable = (object: object, key: string): boolean => {
		if(!(key in object))
		{
			return true;
		}

		const descriptor = Object.getOwnPropertyDescriptor(object, key);

		return descriptor !== undefined && 'value' in descriptor && !descriptor.writable && !descriptor.configurable;
	};

	// Do not cache a definition that acquired a removed input option during validation.
	if('diameter' in port) return;

	for(const key of ['internalDiameter', 'outerDiameter', 'connection', 'nominalSize'])
	{
		if(!stable(port, key))
		{
			return;
		}
	}

	if(port.nominalSize !== undefined &&
		(!stable(port.nominalSize, 'system') || !stable(port.nominalSize, 'value'))
	) {
		return;
	}

	// Another custom getter could have changed a mutable definition during setup.
	// Cache only when the now-frozen data still matches the values we checked.
	if(
		!isQuantity(port.internalDiameter) ||
		!validated.internalDiameter.eq(port.internalDiameter) ||
		port.connection !== validated.connection ||
		port.nominalSize?.system !== validated.nominalSize?.system ||
		port.nominalSize?.value !== validated.nominalSize?.value
	) {
		return;
	}

	if(
		port.outerDiameter === undefined ? validated.outerDiameter !== undefined : !isQuantity(port.outerDiameter) ||
		!validated.outerDiameter?.eq(port.outerDiameter))
	{
		return;
	}

	// Retain the shared definition, not an extra normalized Port and its Quantities.
	verifiedPorts.set(port, port);
}
