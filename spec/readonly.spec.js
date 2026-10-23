import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import {
	Pipe, ASME_B36_10_Pipe, ASTM_B88_Tube, ASTM_B88M_Tube, ISO_11922_Pipe, BWG_Tube,
	Port, Component, TwoPortComponent, PipeComponent, Elbow, Tee, Reducer, Valve,
	PipeError, PipeTypeError, PipeRangeError,
} from '@neutrium/pipe';

const port = new Port({ internalDiameter: '20mm' });
const small = new Port({ internalDiameter: '10mm' });
const geometry = ['internalDiameter', 'outerDiameter', 'wallThickness', 'internalCrossSectionalArea', 'externalCrossSectionalArea', 'materialCrossSectionalArea'];
const componentFields = ['kind', 'ports', 'metadata'];

function expectLocked(object, key) {
	const before = object[key];
	expect(() => { object[key] = 'changed'; }).toThrow(TypeError);
	expect(() => { delete object[key]; }).toThrow(TypeError);
	expect(() => Object.defineProperty(object, key, { value: 'changed' })).toThrow(TypeError);
	expect(object[key]).toBe(before);
}

describe('Runtime read-only fields', () => {
	it.each([
		['Pipe', () => new Pipe('25mm', '2mm'), geometry],
		['ASME', () => ASME_B36_10_Pipe.fromDN(100, 40), [...geometry, 'schedule', 'dn', 'nps', 'nominalSize']],
		['B88', () => new ASTM_B88_Tube('1in', 'L'), [...geometry, 'type', 'nominalSize']],
		['B88M', () => new ASTM_B88M_Tube('22mm', 'B'), [...geometry, 'type', 'nominalSize']],
		['PE', () => new ISO_11922_Pipe('200mm', '10'), [...geometry, 'pressureRating', 'standardDimensionRatio', 'compound', 'nominalSize']],
		['BWG', () => new BWG_Tube('1in', '16'), [...geometry, 'gauge']],
		['Port', () => new Port({ internalDiameter: '20mm' }), ['internalDiameter', 'outerDiameter', 'connection', 'nominalSize']],
		['Component', () => new Component({ kind: 'custom', ports: { supply: port } }), componentFields],
		['TwoPortComponent', () => new TwoPortComponent({ kind: 'custom', inlet: port }), componentFields],
		['PipeComponent', () => new PipeComponent(new Pipe('25mm', '2mm')), [...componentFields, 'pipe']],
		['Elbow', () => new Elbow({ port }), [...componentFields, 'angle', 'bendRadius']],
		['Tee', () => new Tee({ run: port }), [...componentFields, 'branchAngle']],
		['Reducer', () => new Reducer({ inlet: port, outlet: small }), [...componentFields, 'style', 'length']],
		['Valve', () => new Valve({ valveType: 'ball', inlet: port }), [...componentFields, 'valveType', 'boreDiameter', 'faceToFaceLength']],
	])('protects %s fields, including omitted optional fields', (_name, create, fields) => {
		const entity = create();
		for(const field of fields) expectLocked(entity, field);
	});

	it.each([PipeError, PipeTypeError, PipeRangeError])('protects structured %s diagnostics without freezing the rejected input', ErrorClass => {
		const value = { invalid: true };
		const alternatives = ['A'];
		const error = new ErrorClass('invalid', { code: 'INVALID_INPUT', field: 'input', value, allowedValues: alternatives });
		for(const field of ['code', 'field', 'value', 'allowedValues']) expectLocked(error, field);
		alternatives.push('B');
		value.invalid = false;
		expect(error.allowedValues).toEqual(['A']);
		expect(() => error.allowedValues.push('C')).toThrow(TypeError);
		expect(error.value).toBe(value);
	});

	it('lets subclasses finish construction and keeps Quantity calculations usable', () => {
		class CustomPipe extends Pipe { model = 'P1'; }
		class CustomPort extends Port { coating = 'PTFE'; }
		class CustomValve extends Valve { model = 'V1'; }
		const pipe = new CustomPipe('25mm', '2mm');
		const connection = new CustomPort({ internalDiameter: '20mm' });
		const valve = new CustomValve({ valveType: 'custom', inlet: connection });
		const adapter = new PipeComponent(pipe);
		expect(valve.model).toBe('V1');
		expect(valve.ports.inlet.coating).toBe('PTFE');
		expect(adapter.pipe).toBe(pipe);
		expect(adapter.pipe.model).toBe('P1');
		expect(pipe.internalDiameter.to('m').scalar.toNumber()).toBeCloseTo(0.021);
		expect(pipe.internalVolume('2m').to('m^3').scalar.toNumber()).toBeGreaterThan(0);
		expect(connection.internalDiameter.mul(2).to('m').scalar.toNumber()).toBeCloseTo(0.04);
		expect(connection.internalDiameter.eq('20mm')).toBe(true);
	});
});

describe('Shared definition ownership', () => {
	it('adopts port data recursively, including cycles and symbol properties, while copying the map', () => {
		const symbol = Symbol('extra');
		const definition = { internalDiameter: new Quantity('20mm'), coating: { layers: ['PTFE'] }, [symbol]: { grade: 'A' } };
		definition.self = definition;
		const ports = { inlet: definition, outlet: definition };
		const first = new Component({ kind: 'custom', ports });
		const second = new Component({ kind: 'custom', ports });
		ports.inlet = small;
		expect(first.ports.inlet).toBe(definition);
		expect(first.ports.inlet).toBe(second.ports.outlet);
		expectLocked(first.ports, 'inlet');
		expectLocked(definition, 'internalDiameter');
		expectLocked(definition[symbol], 'grade');
		expect(() => definition.coating.layers.push('steel')).toThrow(TypeError);
		expect(definition.self).toBe(definition);
	});

	it('adopts custom pipes without losing methods, identity or additional data', () => {
		const geometry = new Pipe('25mm', '2mm');
		const pipe = {
			...geometry,
			model: { name: 'P1' },
			label() { return this.model.name; },
		};
		const adapter = new PipeComponent(pipe);
		expect(adapter.pipe).toBe(pipe);
		expect(adapter.pipe.label()).toBe('P1');
		expectLocked(pipe, 'internalDiameter');
		expectLocked(pipe.model, 'name');
		expect(() => { pipe.extra = true; }).toThrow(TypeError);
	});

	it.each([new Map(), new Set(), new Date(), new Uint8Array([1])])('rejects mutable opaque containers before freezing any shared input: %s', extra => {
		const first = { internalDiameter: new Quantity('20mm') };
		const second = { internalDiameter: new Quantity('20mm'), extra };
		expect(() => new Component({ kind: 'custom', ports: { first, second } }))
			.toThrow(expect.objectContaining({ name: 'PipeTypeError', code: 'INVALID_INPUT', field: 'ports.second.extra' }));
		expect(Object.isFrozen(first)).toBe(false);
		expect(Object.isFrozen(second)).toBe(false);
	});
});

describe('Metadata snapshots', () => {
	it.each([
		['Component', (metadata, inlet) => new Component({ kind: 'custom', ports: { inlet }, metadata })],
		['TwoPortComponent', (metadata, inlet) => new TwoPortComponent({ kind: 'custom', inlet, metadata })],
		['PipeComponent', (metadata, _inlet, pipe) => new PipeComponent(pipe, { metadata })],
		['Elbow', (metadata, inlet) => new Elbow({ port: inlet, metadata })],
		['Tee', (metadata, inlet) => new Tee({ run: inlet, metadata })],
		['Reducer', (metadata, inlet) => new Reducer({ inlet, outlet: small, metadata })],
		['Valve', (metadata, inlet) => new Valve({ valveType: 'ball', inlet, metadata })],
	])('%s rejects a Quantity metadata root without freezing supplied definitions', (_name, create) => {
		const metadata = new Quantity('2m');
		const inlet = { internalDiameter: new Quantity('20mm'), details: { model: 'P1' } };
		const pipe = new Pipe('25mm', '2mm');
		expect(() => create(metadata, inlet, pipe)).toThrow(PipeTypeError);
		expect(() => create(metadata, inlet, pipe)).toThrow(expect.objectContaining({
			code: 'INVALID_COMPONENT', field: 'metadata', value: metadata,
		}));
		expect(Object.isFrozen(inlet)).toBe(false);
		expect(Object.isFrozen(inlet.details)).toBe(false);
		expect(Object.isFrozen(pipe)).toBe(false);
		expect(Object.isFrozen(metadata)).toBe(false);
	});

	it('accepts Quantities within a null-prototype metadata record and nested arrays', () => {
		const dimension = new Quantity('2m');
		const metadata = Object.assign(Object.create(null), { dimension, nested: [{ dimensions: [dimension] }] });
		const component = new Component({ kind: 'custom', ports: { inlet: port }, metadata });
		expect(Object.getPrototypeOf(component.metadata)).toBeNull();
		expect(Object.isFrozen(component.metadata)).toBe(true);
		expect(Object.isFrozen(component.metadata.nested[0].dimensions)).toBe(true);
		expect(component.metadata.dimension).not.toBe(dimension);
		expect(component.metadata.nested[0].dimensions[0]).toBe(component.metadata.dimension);
		expect(component.metadata.dimension.to('mm').scalar.toNumber()).toBe(2000);
		expect(Object.isFrozen(metadata)).toBe(false);
	});

	it('rejects class instances at the metadata root', () => {
		class Details { model = 'P1'; }
		expect(() => new Component({ kind: 'custom', ports: { inlet: port }, metadata: new Details() }))
			.toThrow(expect.objectContaining({ code: 'INVALID_COMPONENT', field: 'metadata' }));
	});

	it('preserves supported primitive values and null-prototype records', () => {
		const tag = Symbol('tag');
		const values = ['text', 1, true, 10n, tag, null, undefined];
		const nested = Object.assign(Object.create(null), { values });
		const component = new Component({ kind: 'custom', ports: { inlet: port }, metadata: { nested } });
		expect(component.metadata.nested.values).toEqual(values);
		expect(Object.getPrototypeOf(component.metadata.nested)).toBeNull();
		expect(Object.isFrozen(component.metadata.nested.values)).toBe(true);
		expect(Object.isFrozen(nested)).toBe(false);
	});

	it('rejects data-shaped class instances that structural types cannot distinguish', () => {
		class Details { model = 'V1'; }
		expect(() => new Component({ kind: 'custom', ports: { inlet: port }, metadata: { nested: new Details() } }))
			.toThrow(expect.objectContaining({ code: 'INVALID_COMPONENT', field: 'metadata.nested' }));
	});

	it('copies and freezes nested data without changing the caller graph', () => {
		const symbol = Symbol('extra');
		const nested = { values: [1, 2] };
		const metadata = { nested, alias: nested, dimension: new Quantity('10mm'), [symbol]: { value: 1 } };
		metadata.self = metadata;
		const component = new Component({ kind: 'custom', ports: { inlet: port }, metadata });
		nested.values.push(3);
		metadata[symbol].value = 2;
		expect(component.metadata.nested.values).toEqual([1, 2]);
		expect(component.metadata.alias).toBe(component.metadata.nested);
		expect(component.metadata.self).toBe(component.metadata);
		expect(component.metadata[symbol].value).toBe(1);
		expect(() => component.metadata.nested.values.push(4)).toThrow(TypeError);
		expectLocked(component.metadata[symbol], 'value');
		expect(component.metadata.dimension).not.toBe(metadata.dimension);
		expect(component.metadata.dimension.to('m').scalar.toNumber()).toBe(0.01);
	});

	it.each([new Date(), new Map(), new Set(), new Uint8Array([1]), () => 1, { get value() { return 1; } }])('rejects metadata which cannot be snapshotted as immutable data: %s', nested => {
		expect(() => new Component({ kind: 'custom', ports: { inlet: port }, metadata: { nested } }))
			.toThrow(PipeTypeError);
	});
});

describe('Catalogue data and detached outputs', () => {
	it.each([
		[ASME_B36_10_Pipe, ['OD_DATA', 'WT_DATA']],
		[ASTM_B88_Tube, ['NOMINAL_OD', 'OD_DATA', 'WT_DATA']],
		[ASTM_B88M_Tube, ['OD_DATA', 'WT_DATA']],
		[ISO_11922_Pipe, ['SDR_DATA', 'NOMINAL_SIZE_DATA', 'WT_DATA']],
		[BWG_Tube, ['BWG_DATA']],
	])('protects %s tables and every nested row', (Catalogue, keys) => {
		function checkFrozen(value) {
			if(value === null || typeof value !== 'object') return;
			expect(Object.isFrozen(value)).toBe(true);
			for(const key of Object.keys(value)) {
				expectLocked(value, key);
				checkFrozen(value[key]);
			}
		}
		for(const key of keys) {
			expectLocked(Catalogue, key);
			checkFrozen(Catalogue[key]);
		}
	});

	it('returns mutable raw geometry and discovery arrays independent of definitions and tables', () => {
		const pipe = ASME_B36_10_Pipe.fromDN(100, 40);
		const before = pipe.raw('m').internalDiameter;
		const raw = pipe.raw('m');
		raw.internalDiameter = 0;
		expect(raw.internalDiameter).toBe(0);
		expect(pipe.raw('m').internalDiameter).toBe(before);
		const sizes = ASME_B36_10_Pipe.availableSizes();
		sizes.splice(0);
		expect(ASME_B36_10_Pipe.availableSizes().length).toBeGreaterThan(0);
		const results = ASME_B36_10_Pipe.find({ schedule: 40 });
		results.splice(0);
		expect(ASME_B36_10_Pipe.find({ schedule: 40 }).length).toBeGreaterThan(0);
	});
});
