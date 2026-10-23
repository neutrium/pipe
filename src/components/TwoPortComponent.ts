import { validateObject } from '../internal/validation.js';
import { Component } from './Component.js';
import type { ComponentMetadata } from './Component.js';
import type { PortDefinition } from '../connections/Port.js';

export type TwoPortMap = { readonly inlet: PortDefinition; readonly outlet: PortDefinition };

export interface TwoPortComponentOptions
{
	kind: string;
	inlet: PortDefinition;
	/** Defaults to the same connection specification as inlet. */
	outlet?: PortDefinition;
	metadata?: ComponentMetadata;
}

/** Inlet/outlet are reference labels, not an imposed flow direction. */
export class TwoPortComponent extends Component<TwoPortMap>
{
	constructor(options: TwoPortComponentOptions)
	{
		validateObject(options);
		const { kind, inlet, outlet, metadata } = options;

		super({
			kind,
			ports: { inlet, outlet: outlet === undefined ? inlet : outlet },
			metadata,
		});
	}
}
