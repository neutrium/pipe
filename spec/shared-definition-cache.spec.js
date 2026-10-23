import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import { Component, Port, Elbow, Tee, Reducer } from '@neutrium/pipe';

describe('Reusing verified definitions', () => {
	it('preserves identity and geometry across many attachments', () => {
		for(const port of [new Port({ internalDiameter: '20mm' }), { internalDiameter: new Quantity('20mm'), details: { labels: ['shared'] } }]) {
			for(let i = 0; i < 20; i++) {
				const elbow = new Elbow({ port });
				const tee = new Tee({ run: port });
				expect(elbow.ports.inlet).toBe(port);
				expect(tee.ports.branch).toBe(port);
				expect(elbow.ports.inlet.internalDiameter.eq('20mm')).toBe(true);
			}
			expect(Object.isFrozen(port)).toBe(true);
		}
	});

	it('does not trust caller-frozen invalid ports', () => {
		const port = Object.freeze({ internalDiameter: new Quantity('-1mm') });
		for(let i = 0; i < 2; i++)
			expect(() => new Elbow({ port })).toThrow(expect.objectContaining({ field: 'ports.inlet.internalDiameter' }));
	});

	it('does not mistake shallow freezing for successful recursive adoption', () => {
		const details = { values: new Map() };
		const port = Object.freeze({ internalDiameter: new Quantity('20mm'), details });
		for(let i = 0; i < 2; i++) {
			expect(() => new Elbow({ port })).toThrow(expect.objectContaining({ field: 'ports.inlet.details.values' }));
			expect(Object.isFrozen(details)).toBe(false);
		}
		delete details.values;
		new Elbow({ port });
		expect(Object.isFrozen(details)).toBe(true);
	});

	it('does not cache mutable ports after a failed construction', () => {
		const port = { internalDiameter: new Quantity('20mm') };
		expect(() => new Component({ kind: 'custom', ports: { inlet: port }, metadata: { invalid: new Map() } })).toThrow();
		port.internalDiameter = new Quantity('-1mm');
		expect(() => new Tee({ run: port })).toThrow(expect.objectContaining({ field: 'ports.run1.internalDiameter' }));
	});

	it('revalidates accessor-backed dimensions after adoption', () => {
		let diameter = new Quantity('20mm');
		const port = { get internalDiameter() { return diameter; } };
		new Elbow({ port });
		expect(Object.isFrozen(port)).toBe(true);
		diameter = new Quantity('-1mm');
		expect(() => new Tee({ run: port })).toThrow(expect.objectContaining({ field: 'ports.run1.internalDiameter' }));
	});

	it('revalidates inherited dimensions and nested designation getters', () => {
		let diameter = new Quantity('20mm');
		class CustomPort { get internalDiameter() { return diameter; } }
		const inherited = new CustomPort();
		new Elbow({ port: inherited });
		diameter = new Quantity('1kg');
		expect(() => new Elbow({ port: inherited })).toThrow(expect.objectContaining({ code: 'INVALID_DIMENSION' }));
		let value = 20;
		const nominal = { internalDiameter: new Quantity('20mm'), nominalSize: { system: 'DN', get value() { return value; } } };
		new Elbow({ port: nominal });
		value = -1;
		expect(() => new Elbow({ port: nominal })).toThrow(expect.objectContaining({ field: 'ports.inlet.nominalSize.value' }));
	});

	it('rejects removed diameter options on custom definitions before caching', () => {
		const port = { internalDiameter: new Quantity('20mm'), diameter: new Quantity('20mm') };
		for(let i = 0; i < 2; i++)
			expect(() => new Elbow({ port })).toThrow(expect.objectContaining({ code: 'INVALID_PORT', field: 'ports.inlet.diameter' }));
		expect(Object.isFrozen(port)).toBe(false);
	});

	it('still rejects equal reducer ports after both definitions were verified', () => {
		const inlet = { internalDiameter: new Quantity('20mm') };
		const outlet = { internalDiameter: new Quantity('2cm') };
		new Elbow({ port: inlet });
		new Elbow({ port: outlet });
		expect(() => new Reducer({ inlet, outlet })).toThrow(expect.objectContaining({ code: 'INVALID_GEOMETRY' }));
	});
});
