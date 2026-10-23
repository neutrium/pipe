import { Quantity } from '@neutrium/quantity';
import { describe, expect, it } from 'vitest';
import { ISO_11922_Pipe } from '../dist/index.js';

describe("General ISO 11922 PE Pipe COnstructor Tests", function() {

	it('Invalid size throws error ', function() {
		expect(function() { new ISO_11922_Pipe("110", "3.2", "PE100")}).toThrow("Invalid nominal pressure rating (PN) specified");
	});

	it('Invalid nominal throws error ', function() {
		expect(function() { new ISO_11922_Pipe("100mm", "4")}).toThrow("Invalid nominal size provided");
	});

	it('Invalid size and PN type combo throws error ', function() {
		expect(function() { new ISO_11922_Pipe("90mm", "4")}).toThrow("Invalid combination of PN rating and nominal size provided");
	});
});


describe("Testing PN10 200mm Pipe", function() {

	var pipe = new ISO_11922_Pipe("200mm", "10");

	it('Internal diameter correct ', function() {
		expect(pipe.internalDiameter.scalar.toNumber()).toEqual(176.2);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.outerDiameter.scalar.toNumber()).toEqual(200);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wallThickness.scalar.toNumber()).toEqual(11.9);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.internalCrossSectionalArea.scalar.toSD(13).toNumber()).toEqual(24383.81695603);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.externalCrossSectionalArea.scalar.toSD(13).toNumber()).toEqual(31415.92653590);
	});
});

describe("Testing PN10 200mm Pipe with alternate input units", function() {

	var pipe = new ISO_11922_Pipe(new Quantity("200mm").to("in"), "10");

	it('Internal diameter correct ', function() {
		expect(pipe.internalDiameter.scalar.toSD(10).toNumber()).toEqual(6.937007874);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.outerDiameter.scalar.toSD(10).toNumber()).toEqual(7.874015748);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wallThickness.scalar.toSD(10).toNumber()).toEqual(0.468503937);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.internalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(37.79499187);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.externalCrossSectionalArea.scalar.toSD(10).toNumber()).toEqual(48.69478352);
	});
});

describe("Testing 100mm inch Type A raw(\"m\") output", function() {

	var pipe = new ISO_11922_Pipe("200mm", "10").raw("m");

	it('Internal diameter correct ', function() {
		expect(pipe.internalDiameter).toEqual(0.1762);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.outerDiameter).toEqual(0.200);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wallThickness).toEqual(0.0119);
	});

	it('Internal cross sectional area correct ', function() {
		expect(+pipe.internalCrossSectionalArea.toFixed(10)).toEqual(0.0243838170);
	});

	it('External cross sectional area correct ', function() {
		expect(+pipe.externalCrossSectionalArea.toFixed(10)).toEqual(0.0314159265);
	});
});
