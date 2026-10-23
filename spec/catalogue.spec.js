import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import {
	ASME_B36_10_Pipe as ASME,
	ASTM_B88_Tube as B88,
	ASTM_B88M_Tube as B88M,
	ISO_11922_Pipe as ISO,
	BWG_Tube as BWG,
} from '../dist/index.js';

describe("ASME catalogue", function() {
	it('lists exact DN and NPS designations and omits sizes without schedules', function() {
		expect(ASME.availableSizes()).toContain(100);
		expect(ASME.availableSizes("NPS")).toContain(1 / 8);
		expect(ASME.availableSizes()).not.toContain(1050);
		expect(ASME.availableSizes("NPS")).not.toContain(42);
		expect(ASME.availableSchedules(100)).toContain("40");
		expect(ASME.availableSchedules(4, "NPS")).toEqual(ASME.availableSchedules(100));
		expect(ASME.availableSchedules(100.4)).toEqual([]);
		expect(ASME.availableSchedules(1050)).toEqual([]);
	});

	it('filters sizes by schedule and handles unknown selectors', function() {
		expect(ASME.availableSizes("DN", "40")).toContain(100);
		expect(ASME.availableSizes("DN", "40")).not.toContain(550);
		expect(ASME.availableSizes("DN", "missing")).toEqual([]);
		expect(ASME.find({ schedule: "missing" })).toEqual([]);
		expect(() => ASME.availableSizes("mm")).toThrow("Sizing system must be DN or NPS");
	});

	it('selects the smallest adequate schedule 40 pipe using either sizing system', function() {
		const options = { schedule: "40", minimumInternalDiameter: "100mm" };
		const dn = ASME.find(options);
		const nps = ASME.find({ ...options, sizingSystem: "NPS" });
		expect(dn[0].dn).toBe(100);
		expect(nps[0].nps).toBe(4);
		expect(dn.map(p => p.dn)).toEqual(nps.map(p => p.dn));
		expect(dn.every(p => p.schedule === "40" && p.outerDiameter.units() === "mm")).toBe(true);
		expect(nps.every(p => p.schedule === "40" && p.outerDiameter.units() === "in")).toBe(true);
	});

	it('constructs every advertised size and schedule', function() {
		for(const size of ASME.availableSizes()) {
			for(const schedule of ASME.availableSchedules(size)) {
				const pipe = ASME.fromDN(size, schedule);
				expect(pipe.dn).toBe(size);
				expect(pipe.schedule).toBe(schedule);
			}
		}
	});
});

describe("Copper tube catalogues", function() {
	it('excludes unsupported imperial type M combinations', function() {
		expect(B88.availableTypes()).toEqual(["K", "L", "M"]);
		expect(B88.availableTypes(0.25)).toEqual(["K", "L"]);
		expect(B88.availableSizes("M")).not.toContain(0.25);
		expect(B88.availableSizes("M")).not.toContain(0.625);
		expect(B88.availableSizes("M")).toContain(0.75);
		expect(B88.find({ type: "M" }).every(p => p.type === "M")).toBe(true);
	});

	it('lists metric sizes and types without rounding nominal queries', function() {
		expect(B88M.availableTypes(10)).toEqual(["A", "B", "C"]);
		expect(B88M.availableTypes(10.4)).toEqual([]);
		expect(B88M.availableSizes("A")).toContain(10);
		expect(B88M.find({ type: "B" }).every(p => p.type === "B")).toBe(true);
	});

	it.each([[B88, "in"], [B88M, "mm"]])('constructs all entries in %s', function(Tube, unit) {
		for(const size of Tube.availableSizes()) {
			for(const type of Tube.availableTypes(size)) {
				const tube = new Tube(new Quantity(size, unit), type);
				expect(tube.nominalSize.value).toBe(size);
				expect(tube.type).toBe(type);
			}
		}
		expect(() => Tube.availableTypes(-1)).toThrow(expect.objectContaining({ code: "INVALID_SIZE" }));
		expect(Tube.availableSizes("missing")).toEqual([]);
		expect(Tube.find({ type: "missing" })).toEqual([]);
	});
});

describe("PE pipe catalogue", function() {
	it('lists compounds and pressure ratings for each size', function() {
		expect(ISO.availableCompounds()).toEqual(["PE80", "PE100"]);
		expect(ISO.availablePressureRatings(undefined, "PE80")).toContain("3.2");
		expect(ISO.availablePressureRatings()).not.toContain("3.2");
		expect(ISO.availablePressureRatings(90)).not.toContain("4");
		expect(ISO.availablePressureRatings(110)).toContain("4");
		expect(ISO.availableSizes("4")).not.toContain(90);
		expect(ISO.availableSizes("4")).toContain(110);
	});

	it('includes the repaired SDR41 tail and omits unsupported SDR7.4 extensions', function() {
		expect(ISO.availablePressureRatings(2000)).toContain("4");
		expect(ISO.availableSizes("4")).toContain(2000);
		expect(ISO.find({ pressureRating: "4" }).some(p => p.outerDiameter.eq("2000mm"))).toBe(true);
		expect(ISO.availableSizes("25")).toContain(450);
		expect(ISO.availableSizes("25")).not.toContain(500);
		expect(ISO.availableSizes("25")).not.toContain(800);
	});

	it('filters by compound and pressure rating', function() {
		const pipes = ISO.find({ compound: "PE80", pressureRating: "10", minimumInternalDiameter: "150mm" });
		expect(pipes.length).toBeGreaterThan(0);
		expect(pipes.every(p => p.compound === "PE80" && p.pressureRating === "10" && p.internalDiameter.gte("150mm"))).toBe(true);
		expect(ISO.find().every(p => p.compound === "PE100")).toBe(true);
		expect(ISO.availablePressureRatings(200.4)).toEqual([]);
		expect(ISO.availableSizes("missing")).toEqual([]);
		expect(ISO.find({ compound: "missing" })).toEqual([]);
	});

	it.each(["PE80", "PE100"])('constructs every advertised combination for %s', function(compound) {
		for(const size of ISO.availableSizes(undefined, compound)) {
			for(const pn of ISO.availablePressureRatings(size, compound)) {
				const pipe = new ISO(new Quantity(size, "mm"), pn, compound);
				expect(pipe.outerDiameter.eq(new Quantity(size, "mm"))).toBe(true);
				expect(pipe.pressureRating).toBe(pn);
				expect(pipe.compound).toBe(compound);
			}
		}
	});
});

describe("BWG catalogue", function() {
	it('lists aliases and filters gauges against the supplied outer diameter', function() {
		expect(BWG.availableGauges()).toEqual(expect.arrayContaining(["00000", "5/0", "00", "36"]));
		expect(BWG.availableGauges("1in")).not.toContain("00000");
		expect(BWG.availableGauges("1in")).not.toContain("5/0");
		expect(BWG.availableGauges("1in")).toContain("00");
		expect(BWG.availableGauges("25.4mm")).toEqual(BWG.availableGauges("1in"));
		expect(BWG.availableGauges("0.001in")).toEqual([]);
	});

	it('returns tubes with the supplied diameter and supports gauge selection', function() {
		const tubes = BWG.find({ outerDiameter: "1in", gauge: "00", minimumInternalDiameter: "0.24in" });
		expect(tubes).toHaveLength(1);
		expect(tubes[0].gauge).toBe("00");
		expect(tubes[0].internalDiameter.eq("0.24in")).toBe(true);
		expect(tubes[0].outerDiameter.units()).toBe("in");
		expect(BWG.find({ outerDiameter: "1in", gauge: "missing" })).toEqual([]);
		expect(BWG.find({ outerDiameter: "1in", gauge: "5/0" })).toEqual([]);
	});

	it.each(["10kg", "0mm", "-1mm", "1"])('rejects invalid outer diameter %s', function(outerDiameter) {
		expect(() => BWG.availableGauges(outerDiameter)).toThrow();
		expect(() => BWG.find({ outerDiameter })).toThrow();
	});
});

describe.each([
	["ASME", options => ASME.find(options)],
	["B88", options => B88.find(options)],
	["B88M", options => B88M.find(options)],
	["PE", options => ISO.find(options)],
	["BWG", options => BWG.find({ ...options, outerDiameter: "1in" })],
])('%s search contract', function(name, find) {
	it('returns all results with a zero minimum, sorted by internal diameter', function() {
		const all = find({});
		const zero = find({ minimumInternalDiameter: "0mm" });
		expect(all.length).toBeGreaterThan(0);
		expect(zero).toHaveLength(all.length);
		for(let i = 1; i < all.length; i++) {
			expect(all[i].internalDiameter.gte(all[i - 1].internalDiameter)).toBe(true);
		}
	});

	it('uses an inclusive minimum and equivalent units', function() {
		const all = find({});
		const minimum = all[Math.floor(all.length / 2)].internalDiameter;
		const result = find({ minimumInternalDiameter: minimum });
		const converted = find({ minimumInternalDiameter: minimum.to("mm") });
		expect(result[0].internalDiameter.eq(minimum)).toBe(true);
		expect(result.every(pipe => pipe.internalDiameter.gte(minimum))).toBe(true);
		expect(converted.map(pipe => pipe.raw("mm"))).toEqual(result.map(pipe => pipe.raw("mm")));
	});

	it('returns an empty result when no pipe meets the minimum', function() {
		expect(find({ minimumInternalDiameter: "100m" })).toEqual([]);
	});

	it.each(["1kg", "1", "-1mm", new Quantity(Infinity, "mm"), new Quantity(NaN, "mm")])(
		'rejects invalid minimum %s', function(minimumInternalDiameter) {
			expect(() => find({ minimumInternalDiameter })).toThrow();
		}
	);
});

it('returns fresh discovery arrays that cannot mutate the catalogues', function() {
	const queries = [
		() => ASME.availableSizes(), () => ASME.availableSchedules(100),
		() => B88.availableSizes(), () => B88.availableTypes(),
		() => B88M.availableSizes(), () => B88M.availableTypes(),
		() => ISO.availableSizes(), () => ISO.availablePressureRatings(),
		() => ISO.availableCompounds(), () => BWG.availableGauges(),
	];
	for(const query of queries) {
		const original = query();
		const copy = query();
		copy.splice(0);
		expect(query()).toEqual(original);
	}
});
