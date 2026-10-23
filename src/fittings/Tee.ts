import { lockProperties } from '../internal/readonly.js';
import { validateObject, validateNumber } from '../internal/validation.js';
import { Component } from '../components/Component.js';
import type { ComponentMetadata } from '../components/Component.js';
import type { PortDefinition } from '../connections/Port.js';
import { PipeRangeError } from '../errors.js';

export type TeePortMap = { readonly run1: PortDefinition; readonly run2: PortDefinition; readonly branch: PortDefinition };

export interface TeeOptions
{
	run: PortDefinition;
	/** Defaults to run for an equal tee. */
	branch?: PortDefinition;
	/** Branch angle relative to the run axis in degrees. Defaults to 90. */
	branchAngle?: number;
	metadata?: ComponentMetadata;
}

/** Three-port geometry; flow splitting, merging, and path losses belong to a hydraulic model. */
export class Tee extends Component<TeePortMap>
{
	readonly branchAngle: number;

	constructor(options: TeeOptions)
	{
		validateObject(options);
		const { run, branch, branchAngle: angle = 90, metadata } = options;
		validateNumber(angle, "branchAngle", "INVALID_ANGLE");

		if(angle <= 0 || angle >= 180)
		{
			throw new PipeRangeError("Tee branch angle must be between zero and 180 degrees", {
				code: "INVALID_ANGLE", field: "branchAngle", value: angle,
			});
		}

		super({ kind: "tee", ports: { run1: run, run2: run, branch: branch === undefined ? run : branch }, metadata });
		this.branchAngle = angle;

		lockProperties(this, ["branchAngle"]);
	}
}
