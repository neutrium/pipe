//
//	ASTM B88M Seamless Copper Water Tube (Metric)
//

import { lockProperties, freezeDefinition } from '../internal/readonly.js';
import { validateObject } from '../internal/validation.js';
import type { NominalSize } from '../nominalSize.js';
import { Pipe } from './Pipe.js'
import { Quantity } from '@neutrium/quantity';
import { findPipes, usableDimensions, resolveSize, validateIdentifier } from './catalogue.js';
import type { PipeSearchOptions } from './catalogue.js';
import { lengthQuantity } from '../validation.js';
import { tableKeys } from '../internal/tableKeys.js';
import { PipeError } from '../errors.js';

export type ASTMB88MType = "A" | "B" | "C";

export interface ASTMB88MSearchOptions extends PipeSearchOptions
{
	type?: ASTMB88MType;
}

export class ASTM_B88M_Tube extends Pipe
{
	readonly nominalSize: NominalSize;
	// Nominal diameter (mm) - Index used for other parameters, nominal size and OD are the same
	static readonly OD_DATA: readonly number[] = [6,8,10,12,15,18,22,28,35,42,54,67,79,105,130,156,206,257,308];

	// Wall thickness data (millimetres); see README catalogue audit for source and edition.
	static readonly WT_DATA: Readonly<Record<ASTMB88MType, readonly (number | null)[]>> = {
		"A" : [0.8,0.9,0.9,1.2,1.2,1.2,1.6,1.6,1.6,1.8,2.1,2.4,2.8,3.4,4,4.8,6.8,8.5,10.3],
		"B" : [0.7,0.8,0.8,0.9,1,1,1.1,1.2,1.4,1.5,1.7,2,2.3,2.8,3.1,3.5,5,6.3,7.1],
		"C" : [0.6,0.6,0.6,0.6,0.7,0.7,0.8,0.9,1.1,1.2,1.5,1.6,1.8,2.4,2.7,3.1,4.3,5.4,6.4]
	};

	public readonly type: ASTMB88MType;

	/** Available nominal sizes in millimetres, optionally restricted to a type. */
	public static availableSizes(type?: ASTMB88MType): number[]
	{
		if(type !== undefined)
		{
			validateIdentifier(type, 'type', 'INVALID_TYPE');
		}

		return ASTM_B88M_Tube.OD_DATA.filter(size => {
			const types = ASTM_B88M_Tube.availableTypes(size);
			return type === undefined ? types.length > 0 : types.includes(type);
		});
	}

	/** Types available for an exact nominal size in millimeters, or across the catalogue. */
	public static availableTypes(size?: number): ASTMB88MType[]
	{
		const index = size === undefined ? -1 : resolveSize(size, ASTM_B88M_Tube.OD_DATA);

		return tableKeys(ASTM_B88M_Tube.WT_DATA).filter(type =>
			size === undefined ?
				ASTM_B88M_Tube.OD_DATA.some((od, i) => usableDimensions(od, ASTM_B88M_Tube.WT_DATA[type][i])) :
				index >= 0 && usableDimensions(ASTM_B88M_Tube.OD_DATA[index], ASTM_B88M_Tube.WT_DATA[type][index])
		);
	}

	/** Matching tubes in millimetres, ordered by internal diameter, smallest first. */
	public static find(options: ASTMB88MSearchOptions = {}): ASTM_B88M_Tube[]
	{
		validateObject(options);

		return findPipes(options, matches => {
			if(options.type !== undefined)
			{
				validateIdentifier(options.type, 'type', 'INVALID_TYPE');
			}

			const tubes: ASTM_B88M_Tube[] = [];

			for(const [index, size] of ASTM_B88M_Tube.OD_DATA.entries())
			{
				for(const type of tableKeys(ASTM_B88M_Tube.WT_DATA))
				{
					const od = ASTM_B88M_Tube.OD_DATA[index];
					const wt = ASTM_B88M_Tube.WT_DATA[type][index];

					if((options.type === undefined || type === options.type) &&
						usableDimensions(od, wt) && matches(od!, wt!, "mm")
					) {
						tubes.push(new ASTM_B88M_Tube(new Quantity(size, "mm"), type));
					}
				}
			}
			return tubes;
		});
	}

	constructor(size: string | Quantity, type: ASTMB88MType)
	{
		validateIdentifier(type, "type", "INVALID_TYPE");
		const sizeQty = lengthQuantity(size, "size", "Nominal size");
		const units = sizeQty.units();
		const index = resolveSize(sizeQty.to("mm").scalar.toNumber(), ASTM_B88M_Tube.OD_DATA);
		const nominal = ASTM_B88M_Tube.OD_DATA[index]!;
		const diameter = ASTM_B88M_Tube.OD_DATA[index];

		if(index < 0 || diameter === undefined)
		{
			throw new PipeError("Invalid nominal size provided", {
				code: "INVALID_SIZE", field: "size", value: size, allowedValues: ASTM_B88M_Tube.availableSizes(),
			});
		}

		if(!Object.hasOwn(ASTM_B88M_Tube.WT_DATA, type))
		{
			throw new PipeError("Invalid ASTM B88M type must be A, B or C", {
				code: "INVALID_TYPE", field: "type", value: type, allowedValues: ASTM_B88M_Tube.availableTypes(nominal),
			});
		}

		const thickness = ASTM_B88M_Tube.WT_DATA[type][index];

		if(typeof thickness !== "number" || !usableDimensions(diameter, thickness))
		{
			throw new PipeError("Invalid combination of nominal size and ASTM B88 type", {
				code: "INVALID_TYPE", field: "type", value: type, allowedValues: ASTM_B88M_Tube.availableTypes(nominal),
			});
		}

		super(new Quantity(diameter, "mm").to(units), new Quantity(thickness, "mm").to(units));
		this.type = type;
		this.nominalSize = Object.freeze({ system: "ASTM_B88M", value: nominal });
		lockProperties(this, ["type", "nominalSize"]);
	}

	static {
		freezeDefinition(this.OD_DATA);
		freezeDefinition(this.WT_DATA);
		lockProperties(this, ["OD_DATA", "WT_DATA"]);
	}
}
