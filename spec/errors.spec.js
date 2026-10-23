import { describe, expect, it } from 'vitest';
import {
	Pipe, ASME_B36_10_Pipe as ASME, ASTM_B88_Tube as B88,
	ASTM_B88M_Tube as B88M, ISO_11922_Pipe as ISO, BWG_Tube as BWG,
	PipeError, PipeTypeError, PipeRangeError, isPipeError,
} from '../dist/index.js';

function caught(action)
{
	try { action(); }
	catch(error) { return error; }
	throw new Error("Expected the action to throw");
}

describe("Structured selection errors", function() {
	it.each([
		[() => ASME.fromDN(101, "40"), "INVALID_SIZE", "dn", 101, 100],
		[() => ASME.fromNPS(4.01, "40"), "INVALID_SIZE", "nps", 4.01, 4],
		[() => new ASME("42mm", "40"), "INVALID_SIZE", "size", "42mm", 40],
		[() => new ASME("100mm", "20"), "INVALID_SCHEDULE", "schedule", "20", "40"],
		[() => new B88("0.25in", "M"), "INVALID_TYPE", "type", "M", "K"],
		[() => new B88M("10mm", "X"), "INVALID_TYPE", "type", "X", "A"],
		[() => new B88M("11mm", "A"), "INVALID_SIZE", "size", "11mm", 10],
		[() => new ISO("200mm", "10", "PE50"), "INVALID_COMPOUND", "compound", "PE50", "PE100"],
		[() => new ISO("200mm", "3.2"), "INVALID_PRESSURE_RATING", "pressureRating", "3.2", "10"],
		[() => new ISO("100mm", "10"), "INVALID_SIZE", "size", "100mm", 110],
		[() => new ISO("90mm", "4"), "INVALID_PRESSURE_RATING", "pressureRating", "4", "10"],
		[() => new BWG("1in", "100"), "INVALID_GAUGE", "gauge", "100", "16"],
	])('reports code %s and context', function(action, code, field, value, alternative) {
		const error = caught(action);
		expect(error).toBeInstanceOf(PipeError);
		expect(error).toBeInstanceOf(Error);
		expect(isPipeError(error)).toBe(true);
		expect(error).toMatchObject({ code, field, value });
		expect(error.allowedValues).toContain(alternative);
		expect(error.allowedValues).not.toContain(value);
		expect(Object.isFrozen(error.allowedValues)).toBe(true);
	});

	it('reports valid alternatives for the specific size', function() {
		expect(caught(() => new B88("0.25in", "M")).allowedValues).toEqual(["K", "L"]);
		expect(caught(() => new ASME("1050mm", "40")).allowedValues).toEqual([]);
	});

	it('handles an unsupported ISO table combination with a useful error', function() {
		const error = caught(() => new ISO("2000mm", "25"));
		expect(error).toMatchObject({ code: "INVALID_PRESSURE_RATING", field: "pressureRating", value: "25" });
		expect(error.allowedValues).toEqual(["4", "6.3", "8", "10"]);
	});

	it.each(["__proto__", "constructor", "hasOwnProperty"])('rejects inherited keys: %s', function(value) {
		for(const action of [
			() => new ASME("100mm", value),
			() => new B88("1in", value),
			() => new B88M("10mm", value),
			() => new ISO("200mm", value),
			() => new ISO("200mm", "10", value),
			() => new BWG("1in", value),
		]) {
			expect(caught(action)).toBeInstanceOf(PipeError);
		}
	});
});

describe("Structured dimension errors", function() {
	it.each([
		[() => new Pipe("10kg", "1kg"), PipeTypeError, TypeError, "INVALID_DIMENSION", "outerDiameter", "10kg"],
		[() => new Pipe("10mm", "1kg"), PipeTypeError, TypeError, "INVALID_DIMENSION", "wallThickness", "1kg"],
		[() => new Pipe("0mm", "1mm"), PipeRangeError, RangeError, "INVALID_LENGTH", "outerDiameter", "0mm"],
		[() => new Pipe("10mm", "-1mm"), PipeRangeError, RangeError, "INVALID_LENGTH", "wallThickness", "-1mm"],
		[() => new Pipe("10mm", "5mm"), PipeRangeError, RangeError, "INVALID_GEOMETRY", "wallThickness", "5mm"],
		[() => ASME.find({ minimumInternalDiameter: "1kg" }), PipeTypeError, TypeError, "INVALID_DIMENSION", "minimumInternalDiameter", "1kg"],
		[() => BWG.find({ outerDiameter: "-1mm" }), PipeRangeError, RangeError, "INVALID_LENGTH", "outerDiameter", "-1mm"],
		[() => ASME.availableSizes("mm"), PipeError, Error, "INVALID_SIZING_SYSTEM", "sizingSystem", "mm"],
		[() => new Pipe("10mm", "1mm").raw("kg"), PipeTypeError, TypeError, "INVALID_DIMENSION", "unit", "kg"],
	])('retains built-in error compatibility and context', function(action, Class, Base, code, field, value) {
		const error = caught(action);
		expect(error).toBeInstanceOf(Class);
		expect(error).toBeInstanceOf(Base);
		expect(isPipeError(error)).toBe(true);
		expect(error).toMatchObject({ code, field, value });
	});

	it.each([
		() => new Pipe("not a length", "1mm"),
		() => new ASME("not a length", "40"),
		() => new B88("not a length", "K"),
		() => new B88M("not a length", "A"),
		() => new ISO("not a length", "10"),
		() => new BWG("not a length", "16"),
		() => ASME.find({ minimumInternalDiameter: "not a length" }),
	])('preserves the parser error as the cause', function(action) {
		const error = caught(action);
		expect(error).toBeInstanceOf(PipeTypeError);
		expect(error.code).toBe("INVALID_INPUT");
		expect(error.value).toBe("not a length");
		expect(error.cause).toBeInstanceOf(Error);
	});

	it('does not identify unrelated errors as pipe errors', function() {
		for(const error of [new Error("other"), null, undefined, "error", { code: "INVALID_SIZE" }]) {
			expect(isPipeError(error)).toBe(false);
		}
	});
});
