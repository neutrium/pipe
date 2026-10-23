import { Quantity } from '@neutrium/quantity';
import { describe, expect, it } from 'vitest';
import { ASTM_B88M_Tube as ASTM_B88_Tube } from '../dist/index.js';

describe("General type tests", function() {

	it('Invalid type throws error ', function() {
		expect(function() { new ASTM_B88_Tube("10mm", "X")}).toThrow("Invalid ASTM B88M type must be A, B or C");
	});
});

describe("Testing 100mm inch Type A", function() {

	var pipe = new ASTM_B88_Tube("10mm", "A");

	it('Internal diameter correct ', function() {
		expect(pipe.internalDiameter.scalar.toNumber()).toEqual(8.2);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.outerDiameter.scalar.toNumber()).toEqual(10);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wallThickness.scalar.toNumber()).toEqual(0.9);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.internalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(52.81017251);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.externalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(78.53981634);
	});
});

describe("Testing 10 mm Type A with alternate input units", function() {

	var pipe = new ASTM_B88_Tube(new Quantity("10mm").to("in"), "A");

	it('Internal diameter correct ', function() {
		expect(pipe.internalDiameter.scalar.toSD(10).toNumber()).toEqual(0.3228346457);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.outerDiameter.scalar.toSD(10).toNumber()).toEqual(0.3937007874);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wallThickness.scalar.toSD(10).toNumber()).toEqual(0.03543307087);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.internalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(0.0818559311);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.externalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(0.1217369588);
	});
});

describe("Testing 100mm inch Type A raw(\"m\") output", function() {

	var pipe = new ASTM_B88_Tube("10mm", "A").raw("m");

	it('Internal diameter correct ', function() {
		expect(+pipe.internalDiameter).toEqual(0.0082);
	});

	it('Outer diameter correct ', function() {
		expect(+pipe.outerDiameter).toEqual(0.01);
	});

	it('Wall thickness correct ', function() {
		expect(+pipe.wallThickness).toEqual(0.0009);
	});

	it('Internal cross sectional area correct ', function() {
		expect(+pipe.internalCrossSectionalArea.toFixed(14)).toEqual(0.00005281017251);
	});

	it('External cross sectional area correct ', function() {
		expect(+pipe.externalCrossSectionalArea.toFixed(14)).toEqual(0.00007853981634);
	});
});