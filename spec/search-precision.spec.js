import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import { ASME_B36_10_Pipe as Steel, ASTM_B88_Tube as Copper, ASTM_B88M_Tube as MetricCopper, ISO_11922_Pipe as PE, BWG_Tube as BWG } from '@neutrium/pipe';

// The independent reference constructs all candidates, then uses the public
// Quantity comparison. It checks ordering, aliases and geometry as well as counts.
const identify = pipe => [pipe.constructor.name, pipe.nominalSize, pipe.schedule, pipe.type, pipe.compound, pipe.pressureRating, pipe.gauge, pipe.raw()];
describe.each([
	['steel DN', options => Steel.find(options)],
	['steel NPS', options => Steel.find({ ...options, sizingSystem: 'NPS' })],
	['copper', options => Copper.find(options)],
	['metric copper', options => MetricCopper.find(options)],
	['PE80', options => PE.find({ ...options, compound: 'PE80' })],
	['PE100', options => PE.find(options)],
	['BWG mixed units', options => BWG.find({ ...options, outerDiameter: '30mm' })],
])('%s preconstruction filter', (_name, find) => {
	it('matches full-construction filtering at exact and sub-double-precision thresholds', () => {
		const all = find({});
		for(const index of [0, Math.floor(all.length / 2), all.length - 1]) {
			const boundary = all[index].internalDiameter;
			const delta = boundary.mul('1e-18');
			for(const minimum of [boundary.sub(delta), boundary, boundary.add(delta), boundary.to('m')]) {
				const expected = all.filter(pipe => pipe.internalDiameter.gte(minimum));
				expect(find({ minimumInternalDiameter: minimum }).map(identify)).toEqual(expected.map(identify));
			}
		}
	});
});

it('retains sub-double-precision boundary distinctions rather than rounding to JS numbers', () => {
	const pipe = MetricCopper.find({ type: 'B' })[0];
	const boundary = pipe.internalDiameter;
	const higher = boundary.add(new Quantity('1e-18mm'));
	expect(higher.scalar.toNumber()).toBe(boundary.scalar.toNumber());
	expect(MetricCopper.find({ type: 'B', minimumInternalDiameter: boundary })[0].nominalSize).toEqual(pipe.nominalSize);
	expect(MetricCopper.find({ type: 'B', minimumInternalDiameter: higher })[0].nominalSize).not.toEqual(pipe.nominalSize);
});
