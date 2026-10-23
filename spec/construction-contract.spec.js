import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import { Component, TwoPortComponent, PipeComponent, Port, Pipe, Elbow, Tee, Reducer, Valve } from '@neutrium/pipe';

function makePort(diameter = '20mm', builtIn = false)
{
	const port = builtIn ? new Port({ internalDiameter: diameter }) : { internalDiameter: new Quantity(diameter) };
	port.details = { labels: ['original'] };
	return port;
}

describe.each([false, true])('Failed construction leaves ports untouched (built-in ports: %s)', builtIn => {
	it.each([
		['elbow angle', (inlet) => new Elbow({ port: inlet, angle: 0 }), 'angle'],
		['elbow radius', (inlet) => new Elbow({ port: inlet, bendRadius: '0mm' }), 'bendRadius'],
		['tee angle', (inlet, outlet) => new Tee({ run: inlet, branch: outlet, branchAngle: 180 }), 'branchAngle'],
		['reducer style', (inlet, outlet) => new Reducer({ inlet, outlet, style: 'bad' }), 'style'],
		['reducer length', (inlet, outlet) => new Reducer({ inlet, outlet, length: '1kg' }), 'length'],
		['equal reducer diameters', (inlet) => new Reducer({ inlet, outlet: makePort('2cm', builtIn) }), 'ports.outlet'],
		['valve type', (inlet, outlet) => new Valve({ inlet, outlet, valveType: '' }), 'valveType'],
		['valve bore', (inlet, outlet) => new Valve({ inlet, outlet, valveType: 'ball', boreDiameter: '-1mm' }), 'boreDiameter'],
		['valve face-to-face length', (inlet, outlet) => new Valve({ inlet, outlet, valveType: 'ball', faceToFaceLength: 'bad' }), 'faceToFaceLength'],
		['metadata', (inlet) => new Elbow({ port: inlet, metadata: { unsupported: new Map() } }), 'metadata.unsupported'],
		['another invalid port', (inlet) => new TwoPortComponent({ kind: 'custom', inlet, outlet: { internalDiameter: new Quantity('-1mm') } }), 'ports.outlet.internalDiameter'],
	])('%s does not freeze supplied definitions or nested data', (_name, create, field) => {
		const inlet = makePort('20mm', builtIn);
		const outlet = makePort('10mm', builtIn);
		expect(() => create(inlet, outlet)).toThrow(expect.objectContaining({ field }));
		for(const port of [inlet, outlet]) {
			expect(Object.isExtensible(port)).toBe(true);
			expect(Object.isFrozen(port.details)).toBe(false);
			port.details.labels.push('still editable');
			port.extra = true;
		}
		// The caller can correct the options and retry with the same definitions.
		const valid = new Valve({ inlet, outlet, valveType: 'ball' });
		expect(valid.ports.inlet).toBe(inlet);
		expect(valid.ports.outlet).toBe(outlet);
		expect(Object.isFrozen(inlet)).toBe(true);
		expect(Object.isFrozen(outlet.details.labels)).toBe(true);
	});
});

it('leaves both ports editable when a reducer rejects equal diameters in different units', () => {
	const inlet = makePort('20mm');
	const outlet = makePort('2cm');
	expect(() => new Reducer({ inlet, outlet })).toThrow(expect.objectContaining({ code: 'INVALID_GEOMETRY' }));
	expect(Object.isFrozen(inlet)).toBe(false);
	expect(Object.isFrozen(outlet)).toBe(false);
	inlet.details.labels.push('editable');
	outlet.details.labels.push('editable');
});

it('leaves custom pipe data editable when adapter validation fails', () => {
	const geometry = new Pipe('25mm', '2mm');
	const pipe = { ...geometry, internalCrossSectionalArea: new Quantity('-1m^2'), details: { model: 'P1' } };
	expect(() => new PipeComponent(pipe)).toThrow(expect.objectContaining({ field: 'internalCrossSectionalArea' }));
	expect(Object.isFrozen(pipe)).toBe(false);
	pipe.internalCrossSectionalArea = geometry.internalCrossSectionalArea;
	pipe.details.model = 'P2';
	expect(new PipeComponent(pipe).pipe).toBe(pipe);
});

describe('Port mapping snapshots', () => {
	it('evaluates each mapping getter once and stores the validated definition', () => {
		const valid = makePort();
		const invalid = { internalDiameter: new Quantity('-1mm') };
		let reads = 0;
		const ports = { get inlet() { return ++reads === 1 ? valid : invalid; } };
		const component = new Component({ kind: 'custom', ports });
		expect(reads).toBe(1);
		expect(component.ports.inlet).toBe(valid);
		expect(component.ports.inlet.internalDiameter.eq('20mm')).toBe(true);
		expect(Object.isFrozen(valid)).toBe(true);
		expect(Object.isFrozen(invalid)).toBe(false);
		expect(Object.getOwnPropertyDescriptor(component.ports, 'inlet').get).toBeUndefined();
	});

	it('rejects the first invalid mapping value even if a subsequent read would be valid', () => {
		const valid = makePort();
		const invalid = { internalDiameter: new Quantity('-1mm') };
		let reads = 0;
		const ports = { get inlet() { return ++reads === 1 ? invalid : valid; } };
		expect(() => new Component({ kind: 'custom', ports }))
			.toThrow(expect.objectContaining({ field: 'ports.inlet.internalDiameter' }));
		expect(reads).toBe(1);
		expect(Object.isFrozen(invalid)).toBe(false);
		expect(Object.isFrozen(valid)).toBe(false);
	});

	it('reads options.ports once and does not retain the caller mapping', () => {
		const port = makePort();
		const original = { inlet: port };
		let reads = 0;
		const options = { kind: 'custom', get ports() { return ++reads === 1 ? original : { inlet: null }; } };
		const component = new Component(options);
		original.inlet = null;
		expect(reads).toBe(1);
		expect(component.ports.inlet).toBe(port);
		expect(component.ports).not.toBe(original);
		expect(Object.isFrozen(component.ports)).toBe(true);
	});

	it('does not freeze earlier port values if a mapping getter throws', () => {
		const port = makePort();
		const failure = new Error('mapping failed');
		const ports = { inlet: port, get outlet() { throw failure; } };
		expect(() => new Component({ kind: 'custom', ports })).toThrow(failure);
		expect(Object.isFrozen(port)).toBe(false);
	});

	it('reads defaulted two-port and tee options once so their shared ports stay identical', () => {
		const port = makePort();
		let inletReads = 0;
		const twoPort = new TwoPortComponent({ kind: 'custom', get inlet() { inletReads++; return port; } });
		expect(inletReads).toBe(1);
		expect(twoPort.ports.inlet).toBe(twoPort.ports.outlet);
		let runReads = 0;
		const tee = new Tee({ get run() { runReads++; return port; } });
		expect(runReads).toBe(1);
		expect(tee.ports.run1).toBe(tee.ports.run2);
		expect(tee.ports.run1).toBe(tee.ports.branch);
	});
});

describe('Port option snapshots', () => {
	it('reads every option and nominal field once before caching the validated port', () => {
		const reads = {};
		const once = (name, first, later) => () => (reads[name] = (reads[name] ?? 0) + 1) === 1 ? first : later;
		const nominal = Object.defineProperties({}, {
			system: { enumerable: true, get: once('system', 'DN', 'invalid') },
			value: { enumerable: true, get: once('value', 50, -1) },
		});
		const options = Object.defineProperties({}, Object.fromEntries([
			['internalDiameter', '50mm', '-1mm'],
			['outerDiameter', '60mm', '-1mm'], ['connection', 'flanged', null],
			['nominalSize', nominal, null],
		].map(([name, first, later]) => [name, { get: once(name, first, later) }])));
		const port = new Port(options);
		const component = new Component({ kind: 'custom', ports: { inlet: port } });
		expect(Object.values(reads)).toEqual(Array(6).fill(1));
		expect(port.internalDiameter.eq('50mm')).toBe(true);
		expect(port.outerDiameter.eq('60mm')).toBe(true);
		expect(port.connection).toBe('flanged');
		expect(port.nominalSize).toEqual({ system: 'DN', value: 50 });
		expect(Object.isFrozen(port.nominalSize)).toBe(true);
		expect(component.ports.inlet).toBe(port);
	});

	it.each([
		['connection', null, 'flanged', 'connection'],
		['internalDiameter', '-1mm', '50mm', 'internalDiameter'],
		['outerDiameter', '40mm', '60mm', 'outerDiameter'],
		['nominalSize', null, { system: 'DN', value: 50 }, 'nominalSize'],
	])('rejects an initially invalid %s even if a later read would pass', (key, first, later, field) => {
		let reads = 0;
		const options = { internalDiameter: '50mm', get [key]() { return ++reads === 1 ? first : later; } };
		expect(() => new Port(options)).toThrow(expect.objectContaining({ field }));
		expect(reads).toBe(1);
	});

	it.each([['system', 'invalid', 'DN'], ['value', -1, 50]])('rejects an initially invalid nominal %s', (key, first, later) => {
		let reads = 0;
		const nominalSize = { system: 'DN', value: 50, get [key]() { return ++reads === 1 ? first : later; } };
		expect(() => new Port({ internalDiameter: '50mm', nominalSize }))
			.toThrow(expect.objectContaining({ field: 'nominalSize.' + key }));
		expect(reads).toBe(1);
	});

	it('retains nominal fields supplied by inherited accessors', () => {
		class Nominal {
			get system() { return 'DN'; }
			get value() { return 50; }
		}
		expect(new Port({ internalDiameter: '50mm', nominalSize: new Nominal() }).nominalSize)
			.toEqual({ system: 'DN', value: 50 });
	});

	it('snapshots fromPipe dimensions once', () => {
		let internalReads = 0;
		let outerReads = 0;
		const port = Port.fromPipe({
			get internalDiameter() { return new Quantity(++internalReads === 1 ? '50mm' : '-1mm'); },
			get outerDiameter() { return new Quantity(++outerReads === 1 ? '60mm' : '-1mm'); },
		});
		expect([internalReads, outerReads]).toEqual([1, 1]);
		expect(port.internalDiameter.eq('50mm')).toBe(true);
		expect(port.outerDiameter.eq('60mm')).toBe(true);
	});
});

describe('String port names', () => {
	it.each([true, false])('rejects symbol keys before reading or freezing definitions (enumerable: %s)', enumerable => {
		const inlet = makePort();
		const symbol = Symbol('outlet');
		const ports = { inlet };
		Object.defineProperty(ports, symbol, { enumerable, get() { throw new Error('must not read'); } });
		expect(() => new Component({ kind: 'custom', ports }))
			.toThrow(expect.objectContaining({ code: 'INVALID_PORT', field: 'ports', value: symbol }));
		expect(Object.isFrozen(inlet)).toBe(false);
		expect(Object.isFrozen(inlet.details)).toBe(false);
	});

	it('rejects a symbol-only port map', () => {
		expect(() => new Component({ kind: 'custom', ports: { [Symbol('inlet')]: makePort() } }))
			.toThrow(expect.objectContaining({ code: 'INVALID_PORT', field: 'ports' }));
	});

	it('preserves string names and JavaScript numeric property-name coercion', () => {
		const port = makePort();
		const component = new Component({ kind: 'custom', ports: { 1: port, outlet: port } });
		expect(Object.keys(component.ports)).toEqual(['1', 'outlet']);
		expect(component.ports['1']).toBe(port);
	});
});
