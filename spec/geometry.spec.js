import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import { Decimal } from '@neutrium/decimal';
import {
	Pipe, ASME_B36_10_Pipe, ASTM_B88_Tube, ASTM_B88M_Tube, ISO_11922_Pipe, BWG_Tube,
	PipeRangeError, PipeTypeError,
} from '../dist/index.js';

describe("Pipe geometry", function() {
	const pipe = new Pipe("2m", "0.5m"); // Bore diameter 1m; material area 3pi/4 m2.

	it('uses decimal pi for cross-sectional areas', function() {
		expect(pipe.externalCrossSectionalArea.scalar.toString()).toBe("3.1415926535897932385");
		expect(pipe.internalCrossSectionalArea.scalar.toString()).toBe("0.78539816339744830963");
		expect(pipe.materialCrossSectionalArea.scalar.toString()).toBe("2.3561944901923449289");
		expect(pipe.materialCrossSectionalArea.isCompatible("m^2")).toBe(true);
	});

	it('retains material area for walls too thin for subtraction of rounded areas', function() {
		const thin = new Pipe("1m", "1e-20m");
		expect(thin.materialCrossSectionalArea.scalar.toString()).toBe("3.1415926535897932385e-20");
		expect(thin.materialCrossSectionalArea.gt(0)).toBe(true);
	});

	it('keeps geometry precision independent of global Decimal settings', function() {
		const config = Decimal.config;

		try
		{
			Decimal.config = { precision: 5 };
			const fresh = new Pipe("2m", "0.5m");
			expect(fresh.externalCrossSectionalArea.scalar.toString()).toBe("3.1415926535897932385");
			expect(fresh.externalSurfaceArea("4m").scalar.toString()).toBe("25.132741228718345908");
		}
		finally
		{
			Decimal.config = config;
		}
	});

	it.each([
		["internalVolume", "m^3", 3.141592653589793],
		["materialVolume", "m^3", 9.42477796076938],
		["internalSurfaceArea", "m^2", 12.566370614359172],
		["externalSurfaceArea", "m^2", 25.132741228718345],
	])('%s calculates a four-metre segment', function(method, units, expected) {
		const result = pipe[method]("4m");
		expect(result).toBeInstanceOf(Quantity);
		expect(result.isCompatible(units)).toBe(true);
		expect(result.to(units).scalar.toNumber()).toBeCloseTo(expected, 12);
		expect(pipe[method](new Quantity("400cm")).eq(result)).toBe(true);
	});

	it('converts mixed dimensions and exposes material area in raw output', function() {
		const mixed = new Pipe("200cm", "500mm");
		expect(mixed.materialCrossSectionalArea.units()).toBe("cm2");
		expect(mixed.internalVolume("4m").units()).toBe("cm3");
		expect(mixed.externalSurfaceArea("4m").units()).toBe("cm2");
		expect(mixed.materialCrossSectionalArea.to("m2").scalar.toNumber()).toBeCloseTo(2.356194490192345, 14);
		expect(mixed.materialVolume("4000mm").to("m3").scalar.toNumber()).toBeCloseTo(9.42477796076938, 12);
		expect(mixed.raw("m").materialCrossSectionalArea).toBeCloseTo(2.356194490192345, 14);
		expect(mixed.raw().materialCrossSectionalArea).toBeCloseTo(23561.94490192345, 8);
	});

	it('calculates dry material mass using metric or imperial density', function() {
		expect(pipe.mass("4m", "1000kg/m^3").units()).toBe("kg");
		expect(pipe.mass("4m", "1000kg/m^3").scalar.toNumber()).toBeCloseTo(9424.77796076938, 9);
		expect(pipe.mass("400cm", new Quantity("1g/cm^3")).eq(pipe.mass("4m", "1000kg/m^3"))).toBe(true);
		expect(new Pipe("100mm", "6mm").mass("2m", "7850kg/m^3").scalar.toNumber()).toBeCloseTo(27.8181746290069, 12);
		const imperial = new Pipe("1in", "0.1in").mass("1ft", "0.283lb/in^3");
		expect(imperial.to("lb").scalar.toNumber()).toBeCloseTo(0.9601963786431844, 14);
	});

	it.each([
		['m^2/m', 1], ['m*m/m', 1], ['m/s*s', 1], ['m^3/m^2', 1],
		['cm^2/m', 0.0001], ['m*cm/mm', 10],
	])('exports all geometry in compound length units %s', (unit, metresPerUnit) => {
		const raw = pipe.raw(unit);
		expect(raw.internalDiameter * metresPerUnit).toBeCloseTo(1, 14);
		expect(raw.outerDiameter * metresPerUnit).toBeCloseTo(2, 14);
		expect(raw.wallThickness * metresPerUnit).toBeCloseTo(0.5, 14);
		const areaScale = metresPerUnit ** 2;
		expect(raw.internalCrossSectionalArea * areaScale).toBeCloseTo(Math.PI / 4, 14);
		expect(raw.externalCrossSectionalArea * areaScale).toBeCloseTo(Math.PI, 14);
		expect(raw.materialCrossSectionalArea * areaScale).toBeCloseTo(3 * Math.PI / 4, 14);

		const compound = new Pipe(new Quantity(2, unit), new Quantity(0.5, unit));
		expect(compound.raw()).toEqual(pipe.raw('m'));
	});

	it.each(['m^2', 'm/s', 'm^2/', 'not-a-unit'])('retains structured output-unit errors for %s', unit => {
		expect(() => pipe.raw(unit)).toThrow(PipeTypeError);
		expect(() => pipe.raw(unit)).toThrow(expect.objectContaining({
			code: 'INVALID_DIMENSION', field: 'unit', value: unit,
		}));
	});

	it.each([
		ASME_B36_10_Pipe.fromDN(100, "40"),
		new ASTM_B88_Tube("1in", "K"),
		new ASTM_B88M_Tube("10mm", "A"),
		new ISO_11922_Pipe("200mm", "10"),
		new BWG_Tube("1in", "16"),
	])('supports standard-specific pipes', function(standard) {
		expect(standard.materialCrossSectionalArea.gt(0)).toBe(true);
		expect(standard.internalVolume("1m").isCompatible("m3")).toBe(true);
		expect(standard.materialVolume("1m").isCompatible("m3")).toBe(true);
		expect(standard.internalSurfaceArea("1m").isCompatible("m2")).toBe(true);
		expect(standard.externalSurfaceArea("1m").isCompatible("m2")).toBe(true);
		expect(standard.mass("1m", "1000kg/m3").gt(0)).toBe(true);
	});
});

describe.each(["internalVolume", "materialVolume", "internalSurfaceArea", "externalSurfaceArea", "mass"])(
	'%s segment length validation', function(method) {
		const pipe = new Pipe("100mm", "6mm");
		const calculate = length => pipe[method](length, "7850kg/m3");

		it('returns zero for a zero-length segment', function() {
			expect(calculate("0m").scalar.toNumber()).toBe(0);
		});

		it.each([
			["1kg", PipeTypeError, "INVALID_DIMENSION"],
			["1", PipeTypeError, "INVALID_DIMENSION"],
			["-1m", PipeRangeError, "INVALID_LENGTH"],
			[new Quantity(Infinity, "m"), PipeRangeError, "INVALID_LENGTH"],
			[new Quantity(NaN, "m"), PipeRangeError, "INVALID_LENGTH"],
			["invalid", PipeTypeError, "INVALID_INPUT"],
		])('rejects invalid length %s', function(length, ErrorClass, code) {
			expect(() => calculate(length)).toThrow(ErrorClass);
			try { calculate(length); }
			catch(error) {
				expect(error).toMatchObject({ field: "length", value: length, code });
			}
		});
	}
);

describe("Material density validation", function() {
	const pipe = new Pipe("100mm", "6mm");
	it.each([
		["1kg", PipeTypeError, "INVALID_DIMENSION"],
		["1N/m3", PipeTypeError, "INVALID_DIMENSION"],
		["1", PipeTypeError, "INVALID_DIMENSION"],
		["0kg/m3", PipeRangeError, "INVALID_DENSITY"],
		["-1kg/m3", PipeRangeError, "INVALID_DENSITY"],
		[new Quantity(Infinity, "kg/m3"), PipeRangeError, "INVALID_DENSITY"],
		[new Quantity(NaN, "kg/m3"), PipeRangeError, "INVALID_DENSITY"],
		["invalid", PipeTypeError, "INVALID_INPUT"],
	])('rejects invalid material density %s, including for zero length', function(density, ErrorClass, code) {
		for(const length of ["1m", "0m"]) {
			expect(() => pipe.mass(length, density)).toThrow(ErrorClass);
			try { pipe.mass(length, density); }
			catch(error) {
				expect(error).toMatchObject({ field: "density", value: density, code });
			}
		}
	});
});
