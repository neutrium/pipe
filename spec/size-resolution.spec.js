import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import {
	Pipe, ASME_B36_10_Pipe as ASME, ASTM_B88_Tube as B88,
	ASTM_B88M_Tube as B88M, ISO_11922_Pipe as PE, BWG_Tube as BWG,
} from '@neutrium/pipe/pipes';
import { PipeTypeError, PipeRangeError } from '@neutrium/pipe';

describe('Numeric schedules', () => {
	it.each([10, 40, 80, 120, 160])('normalizes schedule %s across construction and queries', schedule => {
		const expected = ASME.fromDN(100, String(schedule));
		for(const pipe of [new ASME('100mm', schedule), ASME.fromDN(100, schedule), ASME.fromNPS(4, schedule)]) {
			expect(pipe.schedule).toBe(String(schedule));
			expect(pipe.raw('mm')).toEqual(expected.raw('mm'));
		}
		for(const sizingSystem of ['DN', 'NPS']) {
			expect(ASME.availableSizes(sizingSystem, schedule)).toEqual(ASME.availableSizes(sizingSystem, String(schedule)));
			const numeric = ASME.find({ sizingSystem, schedule });
			expect(numeric.length).toBeGreaterThan(0);
			const describePipe = pipe => ({ dn: pipe.dn, nps: pipe.nps, schedule: pipe.schedule, ...pipe.raw('mm') });
			expect(numeric.map(describePipe)).toEqual(ASME.find({ sizingSystem, schedule: String(schedule) }).map(describePipe));
			expect(numeric.every(pipe => pipe.schedule === String(schedule))).toBe(true);
		}
	});
	it.each([20, 999, -40, 40.5])('rejects unavailable numeric schedule %s for DN100', schedule => {
		expect(() => ASME.fromDN(100, schedule)).toThrow(expect.objectContaining({ code: 'INVALID_SCHEDULE', value: schedule }));
		expect(ASME.find({ schedule }).map(pipe => pipe.dn)).not.toContain(100);
		expect(ASME.availableSizes('DN', schedule)).not.toContain(100);
	});
	it.each([NaN, Infinity, -Infinity, null, {}, true, '', ' '])('rejects malformed schedule %s consistently', schedule => {
		for(const action of [() => new ASME('100mm', schedule), () => ASME.fromDN(100, schedule), () => ASME.fromNPS(4, schedule), () => ASME.find({ schedule }), () => ASME.availableSizes('DN', schedule)]) {
			expect(action).toThrow(typeof schedule === 'number' ? PipeRangeError : PipeTypeError);
			expect(action).toThrow(expect.objectContaining({ code: 'INVALID_SCHEDULE' }));
		}
	});
	it.each(['STD', 'XS', 'XXS', '40S'])('retains named schedule %s', schedule => {
		expect(ASME.fromDN(100, schedule).schedule).toBe(schedule);
		expect(ASME.find({ schedule }).some(pipe => pipe.dn === 100)).toBe(true);
	});
});

describe.each([
	['steel DN', 100, 'mm', size => new ASME(size, '40'), size => ASME.availableSchedules(size)],
	['steel NPS', 4, 'in', size => new ASME(size, '40'), size => ASME.availableSchedules(size, 'NPS')],
	['imperial copper', 0.75, 'in', size => new B88(size, 'K'), size => B88.availableTypes(size)],
	['metric copper', 22, 'mm', size => new B88M(size, 'B'), size => B88M.availableTypes(size)],
	['PE', 200, 'mm', size => new PE(size, '10'), size => PE.availablePressureRatings(size)],
])('%s size resolution', (name, size, unit, construct, discover) => {
	it('uses catalogue geometry for an exact size and floating-point noise', () => {
		const exact = construct(new Quantity(size, unit));
		for(const sign of [-1, 1]) {
			const noisy = size * (1 + sign * Number.EPSILON);
			expect(discover(noisy)).toEqual(discover(size));
			expect(construct(new Quantity(noisy, unit)).raw('mm')).toEqual(exact.raw('mm'));
		}
	});

	it.each([0.0001, -0.0001, 0.01, -0.01])('rejects a nearby unsupported size with offset %s', offset => {
		const unsupported = size + offset;
		expect(discover(unsupported)).toEqual([]);
		expect(() => construct(new Quantity(unsupported, unit))).toThrow(expect.objectContaining({ code: 'INVALID_SIZE' }));
	});

	it.each([NaN, Infinity, -Infinity, 0, -1])('rejects malformed numeric query %s', value => {
		expect(() => discover(value)).toThrow(PipeRangeError);
		expect(() => discover(value)).toThrow(expect.objectContaining({ code: 'INVALID_SIZE' }));
	});

	it.each(['22', null, {}, true])('does not coerce numeric query %s', value => {
		expect(() => discover(value)).toThrow(PipeTypeError);
	});
});

it.each([
	[B88, 'K', '19.05mm', '0.75in'],
	[B88M, 'B', '22mm', new Quantity('22mm').to('in')],
	[PE, '10', '200mm', new Quantity('200mm').to('in')],
])('resolves converted sizes to the same catalogue geometry', (Class, grade, a, b) => {
	const first = new Class(a, grade);
	const second = new Class(b, grade);
	for(const key of ['outerDiameter', 'wallThickness', 'internalDiameter']) {
		expect(second[key].to('mm').scalar.toNumber()).toBeCloseTo(first[key].to('mm').scalar.toNumber(), 12);
	}
});

it('preserves ASME designation semantics across explicit factories', () => {
	const dn = ASME.fromDN(100 * (1 + Number.EPSILON), '40');
	const nps = ASME.fromNPS(4 * (1 - Number.EPSILON), '40');
	expect(dn.dn).toBe(100);
	expect(nps.nps).toBe(4);
	expect(dn.raw('mm')).toEqual(nps.raw('mm'));
	expect(new ASME('10cm', '40').dn).toBe(100);
	// Converting the designation 4in to 101.6mm does not turn it into DN100.
	expect(() => new ASME('101.6mm', '40')).toThrow(expect.objectContaining({ code: 'INVALID_SIZE' }));
});

describe.each([
	['imperial type', 'INVALID_TYPE', value => new B88('1in', value), value => B88.find({ type: value }), value => B88.availableSizes(value)],
	['metric type', 'INVALID_TYPE', value => new B88M('22mm', value), value => B88M.find({ type: value }), value => B88M.availableSizes(value)],
	['PN', 'INVALID_PRESSURE_RATING', value => new PE('200mm', value), value => PE.find({ pressureRating: value }), value => PE.availableSizes(value)],
	['compound', 'INVALID_COMPOUND', value => new PE('200mm', '10', value), value => PE.find({ compound: value }), value => PE.availablePressureRatings(200, value)],
	['gauge', 'INVALID_GAUGE', value => new BWG('1in', value), value => BWG.find({ outerDiameter: '1in', gauge: value })],
])('%s identifiers', (name, code, construct, find, discover) => {
	it.each([10, 40, null, {}, true, '', ' '])('rejects malformed identifier %s consistently', value => {
		for(const action of [construct, find, discover].filter(Boolean)) {
			expect(() => action(value)).toThrow(PipeTypeError);
			expect(() => action(value)).toThrow(expect.objectContaining({ code, value }));
		}
	});
	it('distinguishes unsupported selections from malformed identifiers', () => {
		expect(() => construct('missing')).toThrow(expect.objectContaining({ code }));
		expect(find('missing')).toEqual([]);
		if(discover) expect(discover('missing')).toEqual([]);
	});
});

it('preserves continuous physical dimensions for custom pipe, BWG, and search bounds', () => {
	expect(new Pipe('200.4mm', '2mm').raw('mm').outerDiameter).toBe(200.4);
	expect(new BWG('200.4mm', '16').raw('mm').outerDiameter).toBe(200.4);
	const matches = PE.find({ pressureRating: '10', minimumInternalDiameter: '176.2001mm' });
	expect(matches.every(pipe => pipe.internalDiameter.gte('176.2001mm'))).toBe(true);
	expect(matches.some(pipe => pipe.outerDiameter.eq('200mm'))).toBe(false);
});
