//
//	ISO 11922 & AS/NZS 4130:2009 Polyethylene (PE) pipes for pressure applications
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
import { PipeError, PipeTypeError } from '../errors.js';

export type PECompound = "PE80" | "PE100";
export type PressureRating = "3.2" | "4" | "6.3" | "8" | "10" | "12.5" | "16" | "20" | "25";

export interface ISOPipeSearchOptions extends PipeSearchOptions
{
	pressureRating?: PressureRating;
	/** Defaults to PE100. */
	compound?: PECompound;
}

export class ISO_11922_Pipe extends Pipe
{
	readonly nominalSize: NominalSize;
	static readonly SDR_DATA: Readonly<Record<PECompound, Readonly<Partial<Record<PressureRating, number>>>>> = {
		"PE80": {"3.2": 41, "4": 33, "6.3": 21, "8": 17, "10": 13.6, "12.5": 11, "16": 9, "20": 7.4},
		"PE100": {"4": 41, "6.3": 26, "8": 21, "10": 17, "12.5": 13.6, "16": 11, "20": 9, "25": 7.4}
	};

	// The Nominal size and outer diameter are the same when assuming the minimum OD for AS/NZS 4130
	static readonly NOMINAL_SIZE_DATA: readonly number[] = [16,20,25,32,40,50,63,75,90,110,125,140,160,180,200,225,250,280,315,355,400,450,500,560,630,710,800,900,1000,1200,1400,1600,1800,2000];

	// Historical AS/NZS 4130:2009 Series 1 minimum wall thicknesses in mm.
	// Audit references: Vinidex capability matrix and APS 2020 Rev 1, printed pp16-17.
	// -1 means outside this catalogue's coverage. See README for manufacturer extensions.
	static readonly WT_DATA: Readonly<Record<number, readonly number[]>> = {
		"41" : [-1,-1,-1,-1,-1,-1,-1,-1,-1,2.7,3.1,3.5,4,4.4,4.9,5.5,6.2,6.9,7.7,8.7,9.8,11,12.3,13.7,15.4,17.4,19.6,22,24.5,29.4,34.4,39.3,43.8,48.8],
		"33" : [-1,-1,-1,-1,-1,-1,-1,2.3,2.8,3.4,3.9,4.3,4.9,5.5,6.2,6.9,7.7,8.6,9.7,10.9,12.3,13.8,15.3,17.2,19.3,21.8,24.5,27.6,30.6,36.7,42.9,49,54.5,60.6],
		"26" : [-1,-1,-1,-1,-1,-1,2.4,2.9,3.5,4.3,4.8,5.4,6.2,6.9,7.7,8.6,9.6,10.7,12.1,13.6,15.3,17.2,19.1,21.4,24.1,27.2,30.6,34.4,38.2,45.9,53.2,61.3,69.1,76.9],
		"21" : [-1,-1,-1,1.6,1.9,2.4,3,3.6,4.3,5.3,6,6.7,7.7,8.6,9.6,10.8,11.9,13.4,15,16.9,19.1,21.5,23.9,26.7,30,33.9,38.1,42.9,47.7,57.2,66.7,76.2,85.7,95.2],
		"17" : [-1,-1,1.6,1.9,2.4,3,3.8,4.5,5.4,6.6,7.4,8.3,9.5,10.7,11.9,13.4,14.8,16.6,18.7,21.1,23.7,26.7,29.6,33.2,37.3,42.1,47.4,53.5,59.3,67.9,82.4,94.1,105.9,117.6],
		"13.6" : [-1,1.6,1.9,2.4,3,3.7,4.7,5.5,6.6,8.1,9.2,10.3,11.8,13.3,14.7,16.6,18.4,20.6,23.2,26.1,29.4,33.1,36.8,41.2,46.3,52.2,58.8,66.2,72.5,88.2,102.9,117.6,-1,-1],
		"11" : [1.6,1.9,2.3,2.9,3.7,4.6,5.8,6.8,8.2,10,11.4,12.7,14.6,16.4,18.2,20.5,22.7,25.4,28.6,32.2,36.3,40.9,45.4,50.8,57.2,64.5,72.5,81.7,90.2,-1,-1,-1,-1,-1],
		"9" : [1.8,2.3,2.8,3.6,4.5,5.6,7.1,8.4,10.1,12.3,14,15.7,17.9,20.1,22.4,25.1,27.9,31.3,35.2,39.6,44.7,50.2,55.8,62.5,70.3,79.3,89.3,-1,-1,-1,-1,-1,-1,-1],
		// Only tabulated values through DN450; manufacturer-calculated extensions are excluded.
		"7.4" : [2.2,2.8,3.5,4.4,5.5,6.9,8.6,10.3,12.3,15.1,17.1,19.2,21.9,24.6,27.3,30.8,34.2,38.3,43,48.5,54.6,61.5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]
	};


	public readonly pressureRating: PressureRating;
	public readonly standardDimensionRatio: number;
	public readonly compound: PECompound;

	public static availableCompounds(): PECompound[]
	{
		return tableKeys(ISO_11922_Pipe.SDR_DATA);
	}

	/** Available nominal sizes in millimetres; compound defaults to PE100. */
	public static availableSizes(pressureRating?: PressureRating, compound: PECompound = "PE100"): number[]
	{
		if(pressureRating !== undefined)
		{
			validateIdentifier(pressureRating, "pressureRating", "INVALID_PRESSURE_RATING");
		}

		return ISO_11922_Pipe.NOMINAL_SIZE_DATA.filter(size => {
			const ratings = ISO_11922_Pipe.availablePressureRatings(size, compound);
			return pressureRating === undefined ? ratings.length > 0 : ratings.includes(pressureRating);
		});
	}

	/** PN ratings for an exact size in millimetres, or across the compound's catalogue. */
	public static availablePressureRatings(size?: number, compound: PECompound = "PE100"): PressureRating[]
	{
		const index = size === undefined ? -1 : resolveSize(size, ISO_11922_Pipe.NOMINAL_SIZE_DATA);
		validateIdentifier(compound, "compound", "INVALID_COMPOUND");

		if(!Object.hasOwn(ISO_11922_Pipe.SDR_DATA, compound))
		{
			return [];
		}

		const ratings = ISO_11922_Pipe.SDR_DATA[compound];

		return tableKeys(ratings).filter(pressureRating => {
			const standardDimensionRatio = ratings[pressureRating];
			const walls = standardDimensionRatio === undefined ? [] : ISO_11922_Pipe.WT_DATA[standardDimensionRatio] ?? [];
			return size === undefined ?
				ISO_11922_Pipe.NOMINAL_SIZE_DATA.some((od, i) => usableDimensions(od, walls[i])) :
				index >= 0 && usableDimensions(size, walls[index]);
		}).sort((a, b) => Number(a) - Number(b));
	}

	/** Matching pipes in millimeters, ordered by internal diameter, smallest first. */
	public static find(options: ISOPipeSearchOptions = {}): ISO_11922_Pipe[]
	{
		validateObject(options);
		const compound = options.compound === undefined ? "PE100" : options.compound;

		if(options.pressureRating !== undefined)
		{
			validateIdentifier(options.pressureRating, "pressureRating", "INVALID_PRESSURE_RATING");
		}

		if('pn' in options)
		{
			throw new PipeTypeError("The pn option has been removed; use pressureRating", {
				code: "INVALID_PRESSURE_RATING", field: "pn", value: options.pn,
			});
		}
		const pressureRating = options.pressureRating;

		return findPipes(options, matches => {
			const pipes: ISO_11922_Pipe[] = [];
			const ratings = ISO_11922_Pipe.availablePressureRatings(undefined, compound);

			for(const [index, size] of ISO_11922_Pipe.NOMINAL_SIZE_DATA.entries())
			{
				for(const rating of ratings)
				{
					const sdr = ISO_11922_Pipe.SDR_DATA[compound][rating]!;
					const wt = ISO_11922_Pipe.WT_DATA[sdr]?.[index];

					if((pressureRating === undefined || rating === pressureRating) && usableDimensions(size, wt) && matches(size, wt!, "mm"))
					{
						pipes.push(new ISO_11922_Pipe(new Quantity(size, "mm"), rating, compound));
					}
				}
			}

			return pipes;
		});
	}

	constructor(size: string | Quantity, pressureRating: PressureRating, compound: PECompound = "PE100")
	{
		validateIdentifier(compound, "compound", "INVALID_COMPOUND");

		if(!Object.hasOwn(ISO_11922_Pipe.SDR_DATA, compound))
		{
			throw new PipeError("Invalid compound specified", {
				code: "INVALID_COMPOUND", field: "compound", value: compound,
				allowedValues: ISO_11922_Pipe.availableCompounds(),
			});
		}

		validateIdentifier(pressureRating, "pressureRating", "INVALID_PRESSURE_RATING");
		const ratings = ISO_11922_Pipe.SDR_DATA[compound];
		const standardDimensionRatio = Object.hasOwn(ratings, pressureRating) ? ratings[pressureRating] : undefined;

		if(standardDimensionRatio === undefined)
		{
			throw new PipeError("Invalid nominal pressure rating (PN) specified", {
				code: "INVALID_PRESSURE_RATING", field: "pressureRating", value: pressureRating,
				allowedValues: ISO_11922_Pipe.availablePressureRatings(undefined, compound),
			});
		}

		const sizeQty = lengthQuantity(size, "size", "Nominal size");
		const index = resolveSize(sizeQty.to("mm").scalar.toNumber(), ISO_11922_Pipe.NOMINAL_SIZE_DATA, "size");
		const nominal = ISO_11922_Pipe.NOMINAL_SIZE_DATA[index]!;

		if(index < 0)
		{
			throw new PipeError("Invalid nominal size provided", {
				code: "INVALID_SIZE", field: "size", value: size,
				allowedValues: ISO_11922_Pipe.availableSizes(pressureRating, compound),
			});
		}

		const thickness = ISO_11922_Pipe.WT_DATA[standardDimensionRatio]?.[index];

		if(thickness === undefined || !usableDimensions(nominal, thickness))
		{
			throw new PipeError("Invalid combination of PN rating and nominal size provided", {
				code: "INVALID_PRESSURE_RATING", field: "pressureRating", value: pressureRating,
				allowedValues: ISO_11922_Pipe.availablePressureRatings(nominal, compound),
			});
		}

		super(new Quantity(nominal, "mm").to(sizeQty.units()), new Quantity(thickness, "mm").to(sizeQty.units()));
		this.compound = compound;
		this.pressureRating = pressureRating;
		this.standardDimensionRatio = standardDimensionRatio;
		this.nominalSize = Object.freeze({ system: "DN", value: nominal });
		lockProperties(this, ["pressureRating", "standardDimensionRatio", "compound", "nominalSize"]);
	}

	static {
		freezeDefinition(this.SDR_DATA);
		freezeDefinition(this.NOMINAL_SIZE_DATA);
		freezeDefinition(this.WT_DATA);
		lockProperties(this, ["SDR_DATA", "NOMINAL_SIZE_DATA", "WT_DATA"]);
	}
}
