import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import { Pipe, ASME_B36_10_Pipe as Steel, ASTM_B88_Tube as B88, ASTM_B88M_Tube as B88M, ISO_11922_Pipe as PE, BWG_Tube as BWG } from '@neutrium/pipe/pipes';
import { Port } from '@neutrium/pipe/connections';
import { PipeComponent } from '@neutrium/pipe/pipes';
import { Reducer } from '@neutrium/pipe/fittings';

describe('Canonical dimensions without deprecated aliases', () => {
	it.each([
		new Pipe('100mm', '5mm'), Steel.fromDN(100, 40), new B88('1in', 'K'),
		new B88M('22mm', 'B'), new PE('200mm', '10'), new BWG('1in', '16'),
	])('exposes consistent geometry on %s', pipe => {
		const names = { id: 'internalDiameter', od: 'outerDiameter', wt: 'wallThickness', icsa: 'internalCrossSectionalArea', ecsa: 'externalCrossSectionalArea', mcsa: 'materialCrossSectionalArea' };
		const raw = pipe.raw('m');

		for(const [alias, canonical] of Object.entries(names))
		{
			expect(alias in pipe).toBe(false);
			expect(alias in raw).toBe(false);
			expect(raw[canonical]).toBe(pipe[canonical].to(canonical.endsWith('Area') ? 'm2' : 'm').scalar.toNumber());
		}

		const port = Port.fromPipe(pipe);
		expect(port.internalDiameter.eq(pipe.internalDiameter)).toBe(true);
		expect(port.outerDiameter.eq(pipe.outerDiameter)).toBe(true);
		expect('diameter' in port).toBe(false);
		expect(new PipeComponent(pipe).ports.inlet.internalDiameter.eq(pipe.internalDiameter)).toBe(true);
	});
	it('supports canonical structural ports and preserves custom fields', () => {
		const inlet = { internalDiameter: new Quantity('20mm'), custom: 'retained' };
		const outlet = { internalDiameter: new Quantity('10mm') };
		const reducer = new Reducer({ inlet, outlet });
		expect(reducer.ports.inlet).toBe(inlet);
		expect(reducer.ports.inlet.custom).toBe('retained');
	});
	it.each([
		{ diameter: '20mm' },
		{ internalDiameter: '20mm', diameter: '2cm' },
		{ internalDiameter: '20mm', diameter: undefined },
	])('rejects removed port options: %s', options => {
		expect(() => new Port(options)).toThrow(expect.objectContaining({ field: 'diameter', code: 'INVALID_PORT' }));
	});
});

describe('Catalogue designations', () => {
	it.each([
		[Steel.fromNPS(4, 40), 'DN', 100],
		[new B88('25.4mm', 'K'), 'ASTM_B88', 1],
		[new B88M(new Quantity('22mm').to('in'), 'B'), 'ASTM_B88M', 22],
		[new PE('200mm', '10'), 'DN', 200],
	])('identifies the nominal system for %s independently of input units', (pipe, system, value) => {
		expect(pipe.nominalSize).toEqual({ system, value });
		expect(Object.isFrozen(pipe.nominalSize)).toBe(true);
		expect(Port.fromPipe(pipe, { nominalSize: pipe.nominalSize }).nominalSize).toEqual(pipe.nominalSize);
	});
	it('exposes canonical designations and removes deprecated properties', () => {
		const pe = new PE('200mm', '10');
		expect(pe.pressureRating).toBe('10');
		expect(pe.standardDimensionRatio).toBe(17);
		for(const key of ['pn', 'sdr']) expect(key in pe).toBe(false);
		expect('NPS_DATA' in PE).toBe(false);
		expect(PE.NOMINAL_SIZE_DATA).toContain(200);
		const tube = new BWG('1in', '16');
		expect(tube.gauge).toBe('16');
		expect('bwg' in tube).toBe(false);
		for(const pipe of [new B88('1in', 'K'), new B88M('22mm', 'B')]) expect('nps' in pipe).toBe(false);
		expect(Steel.fromNPS(4, 40).nps).toBe(4);
		const canonical = PE.find({ pressureRating: '10' });
		expect(canonical.length).toBeGreaterThan(0);
		expect(canonical.every(pipe => pipe.pressureRating === '10')).toBe(true);
		expect(() => PE.find({ pressureRating: 10 })).toThrow(expect.objectContaining({ field: 'pressureRating', code: 'INVALID_PRESSURE_RATING' }));
	});
	it.each([{ pn: '10' }, { pressureRating: '10', pn: '10' }, { pn: undefined }])('rejects removed pn filters instead of returning unfiltered results: %s', options => {
		expect(() => PE.find(options)).toThrow(expect.objectContaining({ field: 'pn', code: 'INVALID_PRESSURE_RATING' }));
	});
});
