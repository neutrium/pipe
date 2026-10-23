import { lockProperties } from '../internal/readonly.js';
import { validateString } from '../internal/validation.js';
import { Quantity } from '@neutrium/quantity'
import { Decimal } from '@neutrium/decimal';
import { lengthQuantity, densityQuantity } from '../validation.js';
import { PipeRangeError, PipeTypeError } from '../errors.js';
import type { PipeDefinition } from './PipeDefinition.js';

// Match Quantity's arithmetic precision without changing global Decimal settings.
const PI = Decimal.clone(Quantity.config.numeric).PI;

/** Plain numeric geometry in the units requested from raw(). Areas use squared units. */
export type RawPipe = { -readonly [Field in keyof PipeDefinition]: number };

export class Pipe implements PipeDefinition
{
	public readonly internalDiameter : Quantity;		// Actual internal diameter, in the outer diameter units.
	public readonly outerDiameter : Quantity;		// Outer diameter, in the supplied units.
	public readonly wallThickness : Quantity;		// Wall thickness, in the supplied units.
	public readonly internalCrossSectionalArea : Quantity;	// Bore area, in squared outer diameter units.
	public readonly externalCrossSectionalArea : Quantity;	// Enclosed outer area, in squared outer diameter units.
	public readonly materialCrossSectionalArea: Quantity;		// Pipe material cross-sectional area, in the outer diameter's squared units.

	/**
	 * Create a pipe from finite, positive lengths.
	 * Wall thickness must be less than half the outer diameter.
	 */
	constructor(outerDiameter: string | Quantity, wallThickness : string | Quantity)
	{
		this.outerDiameter = lengthQuantity(outerDiameter, "outerDiameter", "Outer diameter");
		this.wallThickness = lengthQuantity(wallThickness, "wallThickness", "Wall thickness");

		// Calculate the rest of the properties
		this.internalDiameter = this.outerDiameter.sub(this.wallThickness.mul(2));

		if(!this.internalDiameter.gt(0))
		{
			throw new PipeRangeError("Wall thickness must be less than half the outer diameter", {
				code: "INVALID_GEOMETRY", field: "wallThickness", value: wallThickness,
			});
		}

		this.internalCrossSectionalArea = this.internalDiameter.mul(this.internalDiameter).mul(PI).div(4);
		this.externalCrossSectionalArea = this.outerDiameter.mul(this.outerDiameter).mul(PI).div(4);
		// pi * t * (D - t) avoids cancellation when the wall is very thin.
		const thickness = this.wallThickness.to(this.outerDiameter.units());
		this.materialCrossSectionalArea = thickness.mul(this.outerDiameter.sub(thickness)).mul(PI);
		lockProperties(this, ["internalDiameter", "outerDiameter", "wallThickness", "internalCrossSectionalArea", "externalCrossSectionalArea", "materialCrossSectionalArea"]);
	}

	/** Bore volume for a finite, non-negative length, in the outer diameter's cubed units. */
	public internalVolume(length: string | Quantity): Quantity
	{
		return this.internalCrossSectionalArea.mul(this.segmentLength(length));
	}

	/** Volume of pipe material, excluding the bore, in the outer diameter's cubed units. */
	public materialVolume(length: string | Quantity): Quantity
	{
		return this.materialCrossSectionalArea.mul(this.segmentLength(length));
	}

	/** Internal curved wall area for a finite, non-negative length; excludes end faces. */
	public internalSurfaceArea(length: string | Quantity): Quantity
	{
		return this.internalDiameter.mul(this.segmentLength(length)).mul(PI);
	}

	/** External curved wall area for a finite, non-negative length; excludes end faces. */
	public externalSurfaceArea(length: string | Quantity): Quantity
	{
		return this.outerDiameter.mul(this.segmentLength(length)).mul(PI);
	}

	/** Dry pipe material mass in kg, using a finite, positive mass-per-volume density. */
	public mass(length: string | Quantity, density: string | Quantity): Quantity
	{
		const volume = this.materialVolume(length);
		return volume.mul(densityQuantity(density)).to("kg");
	}

	private segmentLength(length: string | Quantity): Quantity
	{
		return lengthQuantity(length, "length", "Pipe length", true).to(this.outerDiameter.units());
	}

	public raw(unit?: string): RawPipe
	{
		const units = unit === undefined ? this.outerDiameter.units() : unit;
		validateString(units, "unit", "INVALID_DIMENSION");

		let areaUnits: string;

		try
		{
			const lengthUnit = new Quantity(1, units);
			if(!lengthUnit.isCompatible("m"))
			{
				throw new TypeError("Output unit must have length units");
			}
			// Square the entire expression, including compound units and their scale.
			areaUnits = lengthUnit.mul(lengthUnit).units();
		}
		catch(cause)
		{
			throw new PipeTypeError("Output unit must have length units", {
				code: "INVALID_DIMENSION", field: "unit", value: unit, cause,
			});
		}

		const raw: RawPipe = {
			"internalDiameter": this.internalDiameter.to(units).scalar.toNumber(),
			"outerDiameter": this.outerDiameter.to(units).scalar.toNumber(),
			"wallThickness": this.wallThickness.to(units).scalar.toNumber(),
			"internalCrossSectionalArea": this.internalCrossSectionalArea.to(areaUnits).scalar.toNumber(),
			"externalCrossSectionalArea": this.externalCrossSectionalArea.to(areaUnits).scalar.toNumber(),
			"materialCrossSectionalArea": this.materialCrossSectionalArea.to(areaUnits).scalar.toNumber()
		};

		return raw;
	}
}
