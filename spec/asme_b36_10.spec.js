import { describe, expect, it } from 'vitest';
import { ASME_B36_10_Pipe } from '../dist/index.js';

describe("Explicit nominal-size factories", function() {
	it.each([
		[100, 4, "40", 0.1143],
		[6, 1 / 8, "40", 0.0103],
		[900, 36, "STD", 0.9144],
	])('DN %s and NPS %s select the same pipe', function(dn, nps, schedule, od) {
		const metric = ASME_B36_10_Pipe.fromDN(dn, schedule);
		const imperial = ASME_B36_10_Pipe.fromNPS(nps, schedule);

		for (const pipe of [metric, imperial])
		{
			expect(pipe).toBeInstanceOf(ASME_B36_10_Pipe);
			expect(pipe.dn).toBe(dn);
			expect(pipe.nps).toBe(nps);
			expect(pipe.schedule).toBe(schedule);
			expect(pipe.raw("m").outerDiameter).toBe(od);
		}

		for (const key of ["internalDiameter", "outerDiameter", "wallThickness", "internalCrossSectionalArea", "externalCrossSectionalArea"])
		{
			expect(metric.raw("m")[key]).toBeCloseTo(imperial.raw("m")[key], 12);
		}

		expect(metric.outerDiameter.units()).toBe("mm");
		expect(imperial.outerDiameter.units()).toBe("in");
		expect(metric.raw()).toEqual(new ASME_B36_10_Pipe(`${dn}mm`, schedule).raw());
		expect(imperial.raw()).toEqual(new ASME_B36_10_Pipe(`${nps}in`, schedule).raw());
	});

	it.each([
		["fromDN", 4],
		["fromDN", 100.4],
		["fromNPS", 100],
		["fromNPS", 4.01],
	])('%s rejects unsupported nominal size %s without rounding', function(factory, size) {
		expect(() => ASME_B36_10_Pipe[factory](size, "40")).toThrow("Invalid pipe size provided");
	});

	describe.each(["fromDN", "fromNPS"])('%s validation', function(factory) {
		it.each([0, -1, NaN, Infinity, -Infinity, "4", null, undefined])(
			'rejects invalid size %s', function(size) {
				expect(() => ASME_B36_10_Pipe[factory](size, "40")).toThrow("Invalid pipe size provided");
			}
		);

		it('rejects an unavailable schedule for a valid size', function() {
			const size = factory === "fromDN" ? 100 : 4;
			expect(() => ASME_B36_10_Pipe[factory](size, "20"))
				.toThrow("Invalid combination of pipe size and schedule provided");
		});
	});
});

describe("General Schedule Pipe tests", function() {

	it('Invalid size throws error ', function() {
		expect(function() { new ASME_B36_10_Pipe("42mm", "20")}).toThrow("Invalid pipe size provided");
	});

	it('Invalid size and schedule combo throws error ', function() {
		expect(function() { new ASME_B36_10_Pipe("100mm", "20")}).toThrow("Invalid combination of pipe size and schedule provided");
	});

});

describe("Testing DN 100mm Sch 40 Pipe", function() {

	var pipe = new ASME_B36_10_Pipe("100mm", "40");

	it('Internal diameter correct ', function() {
		expect(pipe.internalDiameter.scalar.toNumber()).toEqual(102.2604);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.outerDiameter.scalar.toNumber()).toEqual(114.3);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wallThickness.scalar.toNumber()).toEqual(6.0198);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.internalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(8213.057355);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.externalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(10260.82645);
	});
});

describe("Testing NPS 4in Sch 40 Pipe", function() {

	var pipe = new ASME_B36_10_Pipe("4in", "40");

	it('Internal diameter correct ', function() {
		expect(pipe.internalDiameter.scalar.toNumber()).toEqual(4.026);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.outerDiameter.scalar.toNumber()).toEqual(4.5);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wallThickness.scalar.toNumber()).toEqual(0.237);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.internalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(12.73026436);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.externalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(15.90431281);
	});

});

describe("Testing NPS 4inch Sch 40 Pipe raw(\"m\") output", function() {

	var pipe = new ASME_B36_10_Pipe("4in", "40").raw("m");

	it('Internal diameter correct ', function() {
		expect(pipe.internalDiameter).toEqual(0.1022604);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.outerDiameter).toEqual(0.1143);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wallThickness).toEqual(0.0060198);
	});

	it('Internal cross sectional area correct ', function() {
		expect(+pipe.internalCrossSectionalArea.toFixed(9)).toEqual(0.008213057);
	});

	it('External cross sectional area correct ', function() {
		expect(+pipe.externalCrossSectionalArea.toFixed(9)).toEqual(0.010260826);
	});
});
