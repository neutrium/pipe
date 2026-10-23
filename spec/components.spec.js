import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import * as root from '@neutrium/pipe';
import { Port } from '@neutrium/pipe/connections';
import { Component, TwoPortComponent } from '@neutrium/pipe/components';
import { Elbow, Tee, Reducer } from '@neutrium/pipe/fittings';
import { Valve } from '@neutrium/pipe/valves';

const large = new Port({ internalDiameter: '100mm' });
const small = new Port({ internalDiameter: '50mm' });

describe('Ports', () => {
	it('derives actual connection dimensions from a pipe, independently of nominal size', () => {
		const pipe = root.ASME_B36_10_Pipe.fromDN(100, '40');
		const nominalSize = { system: 'DN', value: 100 };
		const port = Port.fromPipe(pipe, { nominalSize, connection: 'custom-flange' });
		expect(port.internalDiameter.eq(pipe.internalDiameter)).toBe(true);
		expect(port.outerDiameter.eq(pipe.outerDiameter)).toBe(true);
		expect(port.internalDiameter.eq('100mm')).toBe(false);
		expect(port.connection).toBe('custom-flange');
		nominalSize.value = 80;
		expect(port.nominalSize).toEqual({ system: 'DN', value: 100 });
		expect(Object.isFrozen(port.nominalSize)).toBe(true);
		expect(Port.fromPipe(pipe).nominalSize).toBeUndefined();
	});

	it('accepts mixed units and leaves unspecified dimensions unknown', () => {
		const port = new Port({ internalDiameter: '1in', outerDiameter: new Quantity('30mm') });
		expect(port.internalDiameter.eq('25.4mm')).toBe(true);
		expect(port.outerDiameter.eq('3cm')).toBe(true);
		expect(large.outerDiameter).toBeUndefined();
	});

	it.each([
		[{ internalDiameter: '0mm' }, 'INVALID_LENGTH', 'internalDiameter'],
		[{ internalDiameter: '1kg' }, 'INVALID_DIMENSION', 'internalDiameter'],
		[{ internalDiameter: new Quantity(Infinity, 'm') }, 'INVALID_LENGTH', 'internalDiameter'],
		[{ internalDiameter: '1in', outerDiameter: '25mm' }, 'INVALID_PORT', 'outerDiameter'],
		[{ internalDiameter: '1mm', connection: ' ' }, 'INVALID_PORT', 'connection'],
		[{ internalDiameter: '1mm', nominalSize: { system: 'other', value: 10 } }, 'INVALID_PORT', 'nominalSize.system'],
		[{ internalDiameter: '1mm', nominalSize: { system: 'DN', value: 0 } }, 'INVALID_PORT', 'nominalSize.value'],
		[{ internalDiameter: '1mm', nominalSize: { system: 'NPS', value: Infinity } }, 'INVALID_PORT', 'nominalSize.value'],
	])('rejects invalid port options %o', (options, code, field) => {
		expect(() => new Port(options)).toThrow(expect.objectContaining({ code, field }));
	});
});

describe('Extensible component definitions', () => {
	it('exports the same constructors from root and focused entry points', () => {
		for(const Constructor of [Port, Component, TwoPortComponent, Elbow, Tee, Reducer, Valve])
			expect(root[Constructor.name]).toBe(Constructor);
	});

	it('accepts custom kinds, arbitrary named ports, and structural port definitions', () => {
		const port = { internalDiameter: new Quantity('20mm'), connection: 'custom', coating: 'PTFE' };
		const ports = { supply: port, return: small, drain: small, vent: small };
		const metadata = { manufacturer: 'Example' };
		const component = new Component({ kind: 'my-manifold', ports, metadata });
		ports.supply = small;
		metadata.manufacturer = 'Changed';
		expect(component.ports.supply).toBe(port);
		expect(component.ports.supply.coating).toBe('PTFE');
		expect(Object.keys(component.ports)).toEqual(['supply', 'return', 'drain', 'vent']);
		expect(component.metadata.manufacturer).toBe('Example');
		expect(Object.isFrozen(component.ports)).toBe(true);
	});

	it('supports subclass fields and reuses shared connection specifications', () => {
		class Strainer extends TwoPortComponent {
			constructor(port, meshSize) {
				super({ kind: 'strainer', inlet: port });
				this.meshSize = new Quantity(meshSize);
			}
		}
		const first = new Strainer(large, '0.5mm');
		const second = new Strainer(large, '1mm');
		expect(first.meshSize.eq('0.5mm')).toBe(true);
		expect(first.ports.inlet).toBe(large);
		expect(first.ports.outlet).toBe(second.ports.inlet);
		expect(new TwoPortComponent({ kind: 'custom', inlet: large, outlet: small }).ports.outlet).toBe(small);
	});

	it.each([
		[{ kind: ' ', ports: { inlet: large } }, 'INVALID_COMPONENT'],
		[{ kind: 'custom', ports: {} }, 'INVALID_COMPONENT'],
		[{ kind: 'custom', ports: [] }, 'INVALID_COMPONENT'],
		[{ kind: 'custom', ports: { ' ': large } }, 'INVALID_PORT'],
		[{ kind: 'custom', ports: { inlet: null } }, 'INVALID_PORT'],
		[{ kind: 'custom', ports: { inlet: { internalDiameter: '10mm' } } }, 'INVALID_PORT'],
		[{ kind: 'custom', ports: { inlet: { internalDiameter: new Quantity('-1mm') } } }, 'INVALID_LENGTH'],
		[{ kind: 'custom', ports: { inlet: { internalDiameter: new Quantity('1kg') } } }, 'INVALID_DIMENSION'],
	])('validates custom component inputs %o', (options, code) => {
		expect(() => new Component(options)).toThrow(expect.objectContaining({ code }));
	});
});

describe('Fittings and valves', () => {
	it('defines elbows with optional centreline radius and a direction-change angle', () => {
		const elbow = new Elbow({ port: large, angle: 45, bendRadius: '150mm' });
		expect(elbow.kind).toBe('elbow');
		expect(elbow.angle).toBe(45);
		expect(elbow.bendRadius.eq('15cm')).toBe(true);
		expect(elbow.ports.inlet).toBe(elbow.ports.outlet);
		expect(new Elbow({ port: large }).angle).toBe(90);
		expect(new Elbow({ port: large }).bendRadius).toBeUndefined();
		expect(new Elbow({ port: large, angle: 180 }).angle).toBe(180);
	});

	it('represents equal and reducing tees as three-port components', () => {
		const equal = new Tee({ run: large });
		expect(equal.kind).toBe('tee');
		expect(equal.branchAngle).toBe(90);
		expect(equal.ports).toEqual({ run1: large, run2: large, branch: large });
		const reducing = new Tee({ run: large, branch: small, branchAngle: 60 });
		expect(reducing.ports.branch).toBe(small);
		expect(reducing.branchAngle).toBe(60);
	});

	it('supports either reducer orientation and optional physical dimensions', () => {
		const reducer = new Reducer({ inlet: large, outlet: small, style: 'eccentric', length: '200mm' });
		expect(reducer.kind).toBe('reducer');
		expect(reducer.style).toBe('eccentric');
		expect(reducer.length.eq('0.2m')).toBe(true);
		const reversed = new Reducer({ inlet: small, outlet: large });
		expect(reversed.ports.outlet).toBe(large);
		expect(reversed.style).toBe('concentric');
		expect(reversed.length).toBeUndefined();
		expect(() => new Reducer({ inlet: large, outlet: new Port({ internalDiameter: '0.1m' }) }))
			.toThrow(expect.objectContaining({ code: 'INVALID_GEOMETRY' }));
		expect(() => new Reducer({ inlet: large, outlet: small, style: 'other' }))
			.toThrow(expect.objectContaining({ code: 'INVALID_COMPONENT', field: 'style' }));
	});

	it('supports custom valve types and subclasses with manufacturer data', () => {
		class VendorValve extends Valve {
			constructor() {
				super({ valveType: 'vendor-design', inlet: large, outlet: small, boreDiameter: '40mm', faceToFaceLength: '300mm' });
				this.model = 'V100';
			}
		}
		const valve = new VendorValve();
		expect(valve.kind).toBe('valve');
		expect(valve.valveType).toBe('vendor-design');
		expect(valve.model).toBe('V100');
		expect(valve.ports.outlet).toBe(small);
		expect(valve.boreDiameter.eq('4cm')).toBe(true);
		expect(valve.faceToFaceLength.eq('0.3m')).toBe(true);
		const basic = new Valve({ valveType: 'ball', inlet: large });
		expect(basic.ports.outlet).toBe(large);
		expect(basic.boreDiameter).toBeUndefined();
		expect(basic.faceToFaceLength).toBeUndefined();
		expect(() => new Valve({ valveType: '', inlet: large }))
			.toThrow(expect.objectContaining({ code: 'INVALID_COMPONENT', field: 'valveType' }));
	});

	it.each([0, -1, 181, NaN, Infinity, '90'])('rejects invalid elbow angle %s', angle => {
		expect(() => new Elbow({ port: large, angle })).toThrow(expect.objectContaining({ code: 'INVALID_ANGLE' }));
	});
	it.each([0, -1, 180, NaN, Infinity, '90'])('rejects invalid tee angle %s', branchAngle => {
		expect(() => new Tee({ run: large, branchAngle })).toThrow(expect.objectContaining({ code: 'INVALID_ANGLE' }));
	});
	it.each([
		[options => new Elbow({ port: large, ...options }), 'bendRadius'],
		[options => new Reducer({ inlet: large, outlet: small, ...options }), 'length'],
		[options => new Valve({ valveType: 'ball', inlet: large, ...options }), 'boreDiameter'],
		[options => new Valve({ valveType: 'ball', inlet: large, ...options }), 'faceToFaceLength'],
	])('validates optional dimensions (%s, %s)', (create, field) => {
		expect(() => create({ [field]: '0mm' })).toThrow(expect.objectContaining({ code: 'INVALID_LENGTH', field }));
		expect(() => create({ [field]: '1kg' })).toThrow(expect.objectContaining({ code: 'INVALID_DIMENSION', field }));
	});
});
