import { Quantity } from '@neutrium/quantity';
import { isQuantity } from '@neutrium/quantity/guards.js';
import { PipeTypeError } from '../errors.js';
import type { DeepReadonly } from '../readonly.js';
import type { ComponentMetadata } from '../components/Component.js';

export { lockProperties } from './lockProperties.js';

// Only graphs traversed successfully by this helper qualify; Object.isFrozen
// alone says nothing about nested data. Weak keys avoid retaining user graphs.
const adoptedDefinitions = new WeakSet<object>();

/** Adopt a completed shared definition. Never traverse Quantity caches or prototypes. */
export function freezeDefinition<T>(value: T, field = 'definition'): DeepReadonly<T>
{
	const objects = new Set<object>();
	function collect(current: unknown, path: string): void
	{
		if(current === null || typeof current !== 'object' || adoptedDefinitions.has(current) || isQuantity(current) || objects.has(current))
		{
			return;
		}

		if(!Array.isArray(current) && Object.prototype.toString.call(current) !== '[object Object]')
		{
			throw new PipeTypeError(
				'Shared definitions must contain records, arrays or Quantities',
				{ code: 'INVALID_INPUT', field: path, value: current }
			);
		}

		objects.add(current);

		for(const key of Reflect.ownKeys(current))
		{
			const descriptor = Object.getOwnPropertyDescriptor(current, key)!;

			if('value' in descriptor)
			{
				collect(descriptor.value, path + '.' + String(key));
			}
		}
	}
	// Validate the whole graph before freezing any caller-owned data.
	collect(value, field);

	for(const object of objects)
	{
		Object.freeze(object);
	}

	for(const object of objects)
	{
		adoptedDefinitions.add(object);
	}

	return value as DeepReadonly<T>;
}

/** Copy data metadata so attaching it never freezes the caller's mutable graph. */
export function snapshotMetadata(value: ComponentMetadata, field = 'metadata'): ComponentMetadata
{
	if(value === null || typeof value !== 'object' ||
		(Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
	) {
		throw new PipeTypeError('Metadata must be a plain record', { code: 'INVALID_COMPONENT', field, value });
	}

	return copyMetadata(value, field, new WeakMap<object, unknown>()) as ComponentMetadata;
}

function copyMetadata(value: unknown, field: string, seen: WeakMap<object, unknown>): unknown
{
	if(value === null || (typeof value !== 'object' && typeof value !== 'function'))
	{
		return value;
	}

	if(seen.has(value))
	{
		return seen.get(value);
	}

	if(isQuantity(value))
	{
		const copy = new Quantity(value);
		seen.set(value, copy);

		return copy;
	}

	const prototype = Object.getPrototypeOf(value);

	if(typeof value === 'function' || (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null))
	{
		throw new PipeTypeError(
			'Metadata must contain plain records, arrays, primitives or Quantities',
			{ code: 'INVALID_COMPONENT', field, value }
		);
	}

	const copy = Array.isArray(value) ? new Array(value.length) : Object.create(prototype);
	seen.set(value, copy);

	for(const key of Reflect.ownKeys(value))
	{
		if(Array.isArray(value) && key === 'length')
		{
			continue;
		}

		const descriptor = Object.getOwnPropertyDescriptor(value, key)!;

		if(!('value' in descriptor))
		{
			throw new PipeTypeError(
				'Metadata must use data properties, not accessors',
				{ code: 'INVALID_COMPONENT', field: field + '.' + String(key), value }
			);
		}

		Object.defineProperty(copy, key, { value: copyMetadata(descriptor.value, field + '.' + String(key), seen), enumerable: descriptor.enumerable, writable: false, configurable: false });
	}

	return Object.freeze(copy);
}
