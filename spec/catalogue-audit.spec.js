import { describe, expect, it } from 'vitest';
import { ASME_B36_10_Pipe as ASME, ASTM_B88_Tube as B88, ASTM_B88M_Tube as B88M, ISO_11922_Pipe as PE, BWG_Tube as BWG } from '@neutrium/pipe/pipes';
import { steelWalls, metricCopper, imperialCopper, peCorrections, bwgWalls } from './fixtures/catalogue-reference.js';

describe('Independent dimensional reference checks', () => {
	it.each(Object.entries(steelWalls))('ASME DN%s agrees with the Atlas reference precision', (dn, schedules) => {
		for(const [schedule, expected] of Object.entries(schedules)) {
			const actual = ASME.fromDN(Number(dn), schedule).wallThickness.to('mm').scalar.toNumber();
			// Atlas gives DN40 XXS as 10.15mm; the retained .400in basis is 10.16mm.
			// Penn Stainless confirms .400in. This source discrepancy is documented.
			const tolerance = dn === '40' && schedule === 'XXS' ? 0.0101 : 0.0051;
			expect(Math.abs(actual - expected), `DN${dn} ${schedule}`).toBeLessThanOrEqual(tolerance);
		}
	});

	it.each(metricCopper)('B88M %smm matches the metric reference', (od, ...walls) => {
		for(const [i, type] of ['A', 'B', 'C'].entries()) {
			const tube = new B88M(`${od}mm`, type);
			expect(tube.outerDiameter.eq(`${od}mm`)).toBe(true);
			expect(tube.wallThickness.eq(`${walls[i]}mm`)).toBe(true);
		}
	});

	it.each(imperialCopper)('B88 nominal %sin matches the inch reference', (size, od, ...walls) => {
		for(const [i, type] of ['K', 'L', 'M'].entries()) {
			if(walls[i] === null) {
				expect(B88.availableTypes(size)).not.toContain(type);
				continue;
			}
			const tube = new B88(`${size}in`, type);
			expect(tube.outerDiameter.eq(`${od}in`)).toBe(true);
			expect(tube.wallThickness.eq(`${walls[i]}in`)).toBe(true);
		}
	});

	it.each(peCorrections)('PE DN%s has the independently checked SDR41 and SDR7.4 walls', (size, sdr41, sdr74) => {
		for(const [compound, pn, thickness] of [['PE100', '4', sdr41], ['PE80', '3.2', sdr41], ['PE100', '25', sdr74], ['PE80', '20', sdr74]]) {
			if(thickness === null) {
				expect(() => new PE(`${size}mm`, pn, compound)).toThrow(expect.objectContaining({ code: 'INVALID_PRESSURE_RATING' }));
				continue;
			}
			const pipe = new PE(`${size}mm`, pn, compound);
			expect(pipe.wallThickness.eq(`${thickness}mm`)).toBe(true);
			expect(pipe.outerDiameter.eq(`${size}mm`)).toBe(true);
		}
	});

	it.each(bwgWalls)('BWG %s matches the reference inch thickness', (gauge, wall) => {
		expect(new BWG('2in', gauge).wallThickness.eq(`${wall}in`)).toBe(true);
	});
});

describe('Whole-catalogue integrity', () => {
	it('keeps parallel tables aligned with unique, ordered sizes', () => {
		for(const [sizes, tables] of [[B88.NOMINAL_OD, B88.WT_DATA], [B88M.OD_DATA, B88M.WT_DATA], [PE.NOMINAL_SIZE_DATA, PE.WT_DATA]]) {
			expect(new Set(sizes).size).toBe(sizes.length);
			expect([...sizes].sort((a,b) => a-b)).toEqual(sizes);
			for(const walls of Object.values(tables)) {
				expect(walls).toHaveLength(sizes.length);
				walls.forEach(wall => expect(wall === null || wall === -1 || (Number.isFinite(wall) && wall > 0)).toBe(true));
			}
		}
		expect(B88.OD_DATA).toHaveLength(B88.NOMINAL_OD.length);
		expect(new Set(ASME.OD_DATA.map(row => row[0])).size).toBe(ASME.OD_DATA.length);
		expect(new Set(ASME.OD_DATA.map(row => row[1])).size).toBe(ASME.OD_DATA.length);
		expect(Object.keys(ASME.WT_DATA).map(Number).sort((a,b) => a-b)).toEqual(ASME.OD_DATA.map(row => row[0]));
	});

	it('has physically usable walls and areas for every advertised combination', () => {
		const pipes = [...ASME.find(), ...B88.find(), ...B88M.find(), ...PE.find(), ...PE.find({ compound: 'PE80' }), ...BWG.find({ outerDiameter: '2in' })];
		for(const pipe of pipes) {
			expect(pipe.internalDiameter.gt(0)).toBe(true);
			expect(pipe.wallThickness.mul(2).lt(pipe.outerDiameter)).toBe(true);
			expect(pipe.internalDiameter.add(pipe.wallThickness.mul(2)).eq(pipe.outerDiameter)).toBe(true);
			expect(pipe.internalCrossSectionalArea.gt(0) && pipe.internalCrossSectionalArea.lt(pipe.externalCrossSectionalArea)).toBe(true);
		}
	});

	it('keeps PE wall rows increasing with diameter and decreasing with SDR', () => {
		for(const walls of Object.values(PE.WT_DATA)) {
			const supported = walls.filter(wall => wall > 0);
			expect([...supported].sort((a,b) => a-b)).toEqual(supported);
		}
		PE.NOMINAL_SIZE_DATA.forEach((od, index) => {
			const walls = Object.entries(PE.WT_DATA).map(([sdr, values]) => [Number(sdr), values[index]]).filter(([, wall]) => wall > 0).sort((a,b) => a[0]-b[0]);
			for(let i=1; i<walls.length; i++) expect(walls[i][1]).toBeLessThan(walls[i-1][1]);
			// A coarse plausibility guard, not a replacement for tabulated minimum walls.
			for(const [sdr, wall] of walls) expect(Math.abs(od / wall / sdr - 1)).toBeLessThan(0.15);
		});
		for(const ratings of Object.values(PE.SDR_DATA)) for(const sdr of Object.values(ratings)) expect(PE.WT_DATA[sdr]).toBeDefined();
	});

	it('keeps BWG aliases identical and copper wall grades ordered', () => {
		for(let zeros=2; zeros<=5; zeros++) expect(BWG.BWG_DATA['0'.repeat(zeros)]).toBe(BWG.BWG_DATA[`${zeros}/0`]);
		for(const [types, table] of [[['K','L','M'], B88.WT_DATA], [['A','B','C'], B88M.WT_DATA]]) {
			for(let i=0; i<table[types[0]].length; i++) {
				expect(table[types[0]][i]).toBeGreaterThan(table[types[1]][i]);
				if(table[types[2]][i] !== null) expect(table[types[1]][i]).toBeGreaterThan(table[types[2]][i]);
			}
		}
	});
});
