import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import { Pipe, BWG_Tube } from '@neutrium/pipe/pipes';

describe("Pipe dimensions", function() {
	it('accepts length strings and calculates the internal diameter', function() {
		const pipe = new Pipe("100mm", "6mm");
		expect(pipe.internalDiameter.scalar.toNumber()).toBe(88);
		expect(pipe.internalDiameter.units()).toBe("mm");
	});

	it('accepts Quantity inputs with different length units', function() {
		const pipe = new Pipe(new Quantity("10cm"), new Quantity("6mm"));
		expect(pipe.outerDiameter.units()).toBe("cm");
		expect(pipe.wallThickness.units()).toBe("mm");
		expect(pipe.internalDiameter.scalar.toNumber()).toBe(8.8);
		expect(pipe.raw("m").internalDiameter).toBe(0.088);
	});

	it('uses decimal precision at the wall thickness limit', function() {
		const pipe = new Pipe("1.0000000000000001m", "0.5m");
		expect(pipe.internalDiameter.scalar.toString()).toBe("1e-16");
		expect(() => new Pipe("1m", "0.5000000000000001m"))
			.toThrow("Wall thickness must be less than half the outer diameter");
	});

	describe.each([
		["Outer diameter", value => new Pipe(value, "1mm")],
		["Wall thickness", value => new Pipe("100mm", value)],
	])('%s validation', function(name, create) {
		it.each(["10kg", "10s", "10mm^2", "10mm/s", "10"])(
			'rejects non-length input %s', function(value) {
				expect(() => create(value)).toThrow(name + " must have length units");
			}
		);

		it('rejects bare numeric dimensions as malformed inputs', () => {
			expect(() => create(10)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT', value: 10 }));
		});

		it('rejects non-length Quantity inputs', function() {
			expect(() => create(new Quantity("10kg")))
				.toThrow(name + " must have length units");
		});

		it.each(["0mm", "-1mm"])('rejects non-positive length %s', function(value) {
			expect(() => create(value))
				.toThrow(name + " must be a finite, positive length");
		});

		it.each([NaN, Infinity, -Infinity])('rejects non-finite scalar %s', function(value) {
			expect(() => create(new Quantity(value, "mm")))
				.toThrow(name + " must be a finite, positive length");
		});
	});

	it('rejects compatible quantities that are not lengths', function() {
		expect(() => new Pipe("10kg", "1kg"))
			.toThrow("Outer diameter must have length units");
	});

	it.each([
		["10mm", "5mm"],
		["10mm", "6mm"],
		["1cm", "5mm"],
		["1cm", "6mm"],
		["1in", "12.7mm"],
		["1in", "13mm"],
	])('rejects outer diameter %s with wall thickness %s', function(od, wt) {
		expect(() => new Pipe(od, wt))
			.toThrow("Wall thickness must be less than half the outer diameter");
	});

	it('applies the geometry constraint to pipe subclasses', function() {
		expect(() => new BWG_Tube("0.25in", "00"))
			.toThrow("Wall thickness must be less than half the outer diameter");
	});
});
