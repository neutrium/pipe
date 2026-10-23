import type { DeepReadonly } from '../readonly.js';
import type { Quantity } from '@neutrium/quantity';
import { lockProperties, freezeDefinition, snapshotMetadata } from '../internal/readonly.js';
import { validateObject } from '../internal/validation.js';
import { validatePortDefinition, rememberFrozenPort } from '../internal/ports.js';
import type { PortDefinition } from '../connections/Port.js';
import { PipeTypeError } from '../errors.js';

export type PortMap = Readonly<Record<string, PortDefinition>> & { readonly [key: symbol]: never };
/** JavaScript property names are strings; symbol keys cannot identify ports. */
type NamedPorts<P> = { readonly [K in keyof P]: K extends symbol ? never : PortDefinition };
/** Recursive metadata data; Quantity retains its immutable public arithmetic API. */
export type ComponentMetadataValue =
	string | number | boolean | bigint | symbol | null | undefined |
	Quantity | readonly ComponentMetadataValue[] | ComponentMetadata;

/**
 * Plain data records, recursively copied and frozen on attachment.
 * Runtime validation also rejects accessors and non-plain prototypes, which
 * TypeScript's structural types cannot reliably distinguish from data records.
 */
export interface ComponentMetadata
{
	readonly [key: string]: ComponentMetadataValue;
	readonly [key: symbol]: ComponentMetadataValue;
}

/** Consumers should accept this interface, not require inheritance from Component. */
export interface ComponentDefinition<P extends NamedPorts<P> = PortMap>
{
	/** Open identifier: custom component kinds need no registration. */
	readonly kind: string;
	readonly ports: DeepReadonly<P>;
	readonly metadata?: ComponentMetadata;
}

export interface ComponentOptions<P extends NamedPorts<P> = PortMap>
{
	kind: string;
	/** Own string keys name ports; symbols are rejected. Mapping is copied and definitions are frozen in place. */
	ports: P;
	/** Recursively copied and frozen without freezing the caller's metadata. */
	metadata?: ComponentMetadata;
}

/** Reusable physical definition, independent of network placement and operating state. */
export class Component<P extends NamedPorts<P> = PortMap> implements ComponentDefinition<P>
{
	readonly kind: string;
	readonly ports: DeepReadonly<P>;
	readonly metadata?: ComponentMetadata;

	constructor(options: ComponentOptions<P>)
	{
		validateObject(options);
		const { kind, ports: inputPorts, metadata } = options;

		if(metadata !== undefined)
		{
			validateObject(metadata, "metadata", "INVALID_COMPONENT");
		}

		if(typeof kind !== "string" || !kind.trim())
		{
			throw new PipeTypeError("Component kind must be a non-empty string", {
				code: "INVALID_COMPONENT", field: "kind", value: kind,
			});
		}

		validateObject(inputPorts, "ports", "INVALID_COMPONENT");
		const symbols = Object.getOwnPropertySymbols(inputPorts);

		if(symbols.length !== 0)
		{
			throw new PipeTypeError("Component port names must be strings", {
				code: "INVALID_PORT", field: "ports", value: symbols[0],
			});
		}

		// Read mapping getters once: validate and store this exact snapshot.
		const ports = { ...inputPorts };

		if(Object.keys(ports).length === 0)
		{
			throw new PipeTypeError("Component must have at least one named port", {
				code: "INVALID_COMPONENT", field: "ports", value: inputPorts,
			});
		}

		const validated = new Map<PortDefinition, PortDefinition>();

		for(const [name, port] of Object.entries<PortDefinition>(ports))
		{
			if(!name.trim() || !port || typeof port !== "object")
			{
				throw new PipeTypeError("Component ports require non-empty names and port definitions", {
					code: "INVALID_PORT", field: "ports." + name, value: port,
				});
			}

			// Check structural definitions and Port instances using the same rules.
			// Custom implementations must satisfy the same contract as built-in ports.
			validated.set(port, validatePortDefinition(port, 'ports.' + name));
		}

		this.kind = kind;
		this.metadata = metadata === undefined ? undefined : snapshotMetadata(metadata);
		this.ports = freezeDefinition(ports, 'ports');

		for(const [port, checked] of validated)
		{
			rememberFrozenPort(port, checked);
		}

		lockProperties(this, ["kind", "ports", "metadata"]);
		// Do not freeze this instance: subclasses must be able to add their fields.
	}
}
