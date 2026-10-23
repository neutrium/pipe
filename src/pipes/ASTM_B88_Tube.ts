//
//	ASTM B88 Seamless Copper Water Tube
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

export type ASTMB88Type = "K" | "L" | "M";

export interface ASTMB88SearchOptions extends PipeSearchOptions
{
	type?: ASTMB88Type;
}

export class ASTM_B88_Tube extends Pipe
{
	readonly nominalSize: NominalSize;
	// Nominal diameter (inches) - Index used for other parameters
	static readonly NOMINAL_OD: readonly number[] = [0.25,0.375,0.5,0.625,0.75,1,1.25,1.5,2,2.5,3,3.5,4,5,6,8,10,12];

	// Outer diameter (inches)
	static readonly OD_DATA: readonly number[] = [0.375,0.5,0.625,0.75,0.875,1.125,1.375,1.625,2.125,2.625,3.125,3.625,4.125,5.125,6.125,8.125,10.125,12.125];

	// Wall thickness data (inches)
	static readonly WT_DATA: Readonly<Record<ASTMB88Type, readonly (number | null)[]>> = {
		"K" : [0.035,0.049,0.049,0.049,0.065,0.065,0.065,0.072,0.083,0.095,0.109,0.12,0.134,0.16,0.192,0.271,0.338,0.405],
		"L" : [0.030,0.035,0.04,0.042,0.045,0.05,0.055,0.06,0.07,0.08,0.09,0.1,0.11,0.125,0.14,0.2,0.25,0.28],
		"M" : [null,0.025,0.028,null,0.032,0.035,0.042,0.049,0.058,0.065,0.072,0.083,0.095,0.109,0.122,0.17,0.212,0.254]
	};

	public readonly type: ASTMB88Type;

	/** Available nominal sizes in inches, optionally restricted to a type. */
	public static availableSizes(type?: ASTMB88Type): number[]
	{
		if(type !== undefined)
		{
			validateIdentifier(type, 'type', 'INVALID_TYPE');
		}

		return ASTM_B88_Tube.NOMINAL_OD.filter(size => {
			const types = ASTM_B88_Tube.availableTypes(size);
			return type === undefined ? types.length > 0 : types.includes(type);
		});
	}

	/** Types available for an exact nominal size in inches, or across the catalogue. */
	public static availableTypes(size?: number): ASTMB88Type[]
	{
		const index = size === undefined ? -1 : resolveSize(size, ASTM_B88_Tube.NOMINAL_OD);

		return tableKeys(ASTM_B88_Tube.WT_DATA).filter(type =>
			size === undefined ?
				ASTM_B88_Tube.OD_DATA.some((od, i) => usableDimensions(od, ASTM_B88_Tube.WT_DATA[type][i])) :
				index >= 0 && usableDimensions(ASTM_B88_Tube.OD_DATA[index], ASTM_B88_Tube.WT_DATA[type][index]));
	}

	/** Matching tubes in inches, ordered by internal diameter, smallest first. */
	public static find(options: ASTMB88SearchOptions = {}): ASTM_B88_Tube[]
	{
		validateObject(options);

		return findPipes(options, matches => {
			if(options.type !== undefined)
			{
				validateIdentifier(options.type, 'type', 'INVALID_TYPE');
			}

			const tubes: ASTM_B88_Tube[] = [];

			for(const [index, size] of ASTM_B88_Tube.NOMINAL_OD.entries())
			{
				for(const type of tableKeys(ASTM_B88_Tube.WT_DATA))
				{
					const od = ASTM_B88_Tube.OD_DATA[index];
					const wt = ASTM_B88_Tube.WT_DATA[type][index];
					if((options.type === undefined || type === options.type) &&
						usableDimensions(od, wt) && matches(od!, wt!, "in")
					){
						tubes.push(new ASTM_B88_Tube(new Quantity(size, "in"), type));
					}
				}
			}

			return tubes;
		});
	}

	constructor(size: string | Quantity, type: ASTMB88Type)
	{
		validateIdentifier(type, "type", "INVALID_TYPE");
		const sizeQty = lengthQuantity(size, "size", "Nominal size");
		const units = sizeQty.units();
		const index = resolveSize(sizeQty.to("in").scalar.toNumber(), ASTM_B88_Tube.NOMINAL_OD);
		const nominal = ASTM_B88_Tube.NOMINAL_OD[index]!;
		const diameter = ASTM_B88_Tube.OD_DATA[index];

		if(index < 0 || diameter === undefined)
		{
			throw new PipeError("Invalid nominal size provided", {
				code: "INVALID_SIZE", field: "size", value: size, allowedValues: ASTM_B88_Tube.availableSizes(),
			});
		}

		if(!Object.hasOwn(ASTM_B88_Tube.WT_DATA, type))
		{
			throw new PipeError("Invalid ASTM B88 type must be K, L or M", {
				code: "INVALID_TYPE", field: "type", value: type, allowedValues: ASTM_B88_Tube.availableTypes(nominal),
			});
		}

		const thickness = ASTM_B88_Tube.WT_DATA[type][index];

		if(typeof thickness !== "number" || !usableDimensions(diameter, thickness))
		{
			throw new PipeError("Invalid combination of nominal size and ASTM B88 type", {
				code: "INVALID_TYPE", field: "type", value: type, allowedValues: ASTM_B88_Tube.availableTypes(nominal),
			});
		}

		super(new Quantity(diameter, "in").to(units), new Quantity(thickness, "in").to(units));
		this.type = type;
		this.nominalSize = Object.freeze({ system: "ASTM_B88", value: nominal });
		lockProperties(this, ["type", "nominalSize"]);
	}

	static {
		freezeDefinition(this.NOMINAL_OD);
		freezeDefinition(this.OD_DATA);
		freezeDefinition(this.WT_DATA);
		lockProperties(this, ["NOMINAL_OD", "OD_DATA", "WT_DATA"]);
	}
}
