import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import {
	Pipe, ASME_B36_10_Pipe as Steel, ASTM_B88_Tube as B88, ASTM_B88M_Tube as B88M,
	ISO_11922_Pipe as PE, BWG_Tube as BWG, Port, Component, TwoPortComponent,
	PipeComponent, Elbow, Tee, Reducer, Valve, PipeError, PipeTypeError, PipeRangeError,
	isPipeError, positiveLength, densityQuantity,
} from '@neutrium/pipe';

const port = new Port({ internalDiameter: '20mm' });
const small = new Port({ internalDiameter: '10mm' });
const pipe = new Pipe('20mm', '1mm');
const malformedObjects = [null, [], 1, 'options', true, new Date(0), new Map()];

function errorFrom(action) {
	try { action(); } catch(error) { return error; }
	throw new Error('Expected validation to fail');
}

describe.each([
	['Component', 'custom', value => new Component({ kind: 'custom', ports: { custom: value } })],
	['TwoPortComponent', 'outlet', value => new TwoPortComponent({ kind: 'custom', inlet: port, outlet: value })],
	['Elbow', 'inlet', value => new Elbow({ port: value })],
	['Tee run', 'run1', value => new Tee({ run: value })],
	['Tee branch', 'branch', value => new Tee({ run: port, branch: value })],
	['Reducer inlet', 'inlet', value => new Reducer({ inlet: value, outlet: small })],
	['Reducer outlet', 'outlet', value => new Reducer({ inlet: port, outlet: value })],
	['Valve', 'outlet', value => new Valve({ valveType: 'ball', inlet: port, outlet: value })],
])('%s port error paths', (_name, name, create) => {
	it('identifies malformed port objects at the named port, without a synthetic definition suffix', () => {
		for(const value of malformedObjects) {
			const error = errorFrom(() => create(value));
			expect(error).toBeInstanceOf(PipeTypeError);
			expect(error).toMatchObject({ code: 'INVALID_PORT', field: `ports.${name}`, value });
		}
	});

	it('identifies invalid fields inside the same named port', () => {
		const value = new Quantity('-1mm');
		const error = errorFrom(() => create({ internalDiameter: value }));
		expect(error).toBeInstanceOf(PipeRangeError);
		expect(error).toMatchObject({ code: 'INVALID_LENGTH', field: `ports.${name}.internalDiameter`, value });
	});
});

it('reports missing reducer ports and equal-diameter geometry using named port paths', () => {
	for(const [options, field] of [
		[{ outlet: small }, 'ports.inlet'],
		[{ inlet: port }, 'ports.outlet'],
	]) {
		const error = errorFrom(() => new Reducer(options));
		expect(error).toBeInstanceOf(PipeTypeError);
		expect(error).toMatchObject({ code: 'INVALID_PORT', field, value: undefined });
	}
	const outlet = { internalDiameter: new Quantity('2cm') };
	const error = errorFrom(() => new Reducer({ inlet: port, outlet }));
		expect(error).toBeInstanceOf(PipeRangeError);
		expect(error).toMatchObject({ code: 'INVALID_GEOMETRY', field: 'ports.outlet', value: outlet });
		expect(Object.isFrozen(outlet)).toBe(false);
});

describe.each([
	['Port', options => new Port(options)],
	['Component', options => new Component(options)],
	['TwoPortComponent', options => new TwoPortComponent(options)],
	['PipeComponent', options => new PipeComponent(pipe, options)],
	['Elbow', options => new Elbow(options)],
	['Tee', options => new Tee(options)],
	['Reducer', options => new Reducer(options)],
	['Valve', options => new Valve(options)],
	['Port.fromPipe', options => Port.fromPipe(pipe, options)],
	...Object.entries({ Steel, B88, B88M, PE, BWG }).map(([name, Class]) => [name + '.find', options => Class.find(options)]),
])('%s options validation', (name, create) => {
	it.each(malformedObjects)('rejects malformed options %s before property access', value => {
		const error = errorFrom(() => create(value));
		expect(error).toBeInstanceOf(PipeTypeError);
		expect(error).toMatchObject({ code: 'INVALID_INPUT', field: 'options', value });
		expect(isPipeError(error)).toBe(true);
	});
});

describe('Required objects and metadata', () => {
	it.each([undefined, ...malformedObjects])('rejects malformed definitions %s', value => {
		for(const create of [() => Port.fromPipe(value), () => new PipeComponent(value)]) {
			expect(create).toThrow(PipeTypeError);
			expect(create).toThrow(expect.objectContaining({ field: 'pipe', code: 'INVALID_INPUT' }));
		}
	});
	it.each(malformedObjects)('rejects malformed metadata %s', metadata => {
		for(const create of [
			() => new Component({ kind: 'custom', ports: { inlet: port }, metadata }),
			() => new Elbow({ port, metadata }), () => new Valve({ inlet: port, valveType: 'ball', metadata }),
			() => new PipeComponent(pipe, { metadata }),
		]) expect(create).toThrow(expect.objectContaining({ code: 'INVALID_COMPONENT', field: 'metadata' }));
	});
});

describe.each([
	['angle', value => new Elbow({ port, angle: value }), 181],
	['branchAngle', value => new Tee({ run: port, branchAngle: value }), 180],
	['nominalSize.value', value => new Port({ internalDiameter: '20mm', nominalSize: { system: 'DN', value } }), -1],
])('%s numeric classification', (field, create, tooLarge) => {
	it.each(['90', null, {}, true])('rejects wrong type %s as PipeTypeError', value => {
		const error = errorFrom(() => create(value));
		expect(error).toBeInstanceOf(PipeTypeError);
		expect(error).toMatchObject({ field, value });
	});
	it.each([NaN, Infinity, -Infinity, 0, tooLarge])('rejects invalid numeric value %s as PipeRangeError', value => {
		const error = errorFrom(() => create(value));
		expect(error).toBeInstanceOf(PipeRangeError);
		expect(error).toMatchObject({ field, value });
	});
});

it('defaults only omitted values, and rejects explicit null values', () => {
	expect(new Elbow({ port, angle: undefined }).angle).toBe(90);
	expect(new Tee({ run: port, branch: undefined }).ports.branch).toBe(port);
	expect(new TwoPortComponent({ kind: 'custom', inlet: port, outlet: undefined }).ports.outlet).toBe(port);
	expect(new Reducer({ inlet: port, outlet: small, style: undefined }).style).toBe('concentric');
	expect(pipe.raw(undefined)).toEqual(pipe.raw());
	for(const action of [
		() => new Elbow({ port, angle: null }), () => new Tee({ run: port, branchAngle: null }),
		() => new Tee({ run: port, branch: null }), () => new Valve({ inlet: port, outlet: null, valveType: 'ball' }),
		() => new TwoPortComponent({ kind: 'custom', inlet: port, outlet: null }),
		() => new Reducer({ inlet: port, outlet: small, style: null }),
		() => new Reducer({ inlet: port }), () => pipe.raw(null), () => pipe.raw(''),
	]) expect(action).toThrow(PipeTypeError);
});

it.each([null, undefined, 20, true, {}, ['20mm']])('rejects unsupported dimension input type %s consistently', value => {
	for(const action of [
		() => new Pipe(value, '1mm'), () => new B88(value, 'K'), () => new PE(value, '10'),
		() => new Port({ internalDiameter: value }), () => positiveLength(value),
		() => densityQuantity(value),
	]) {
		expect(action).toThrow(PipeTypeError);
		expect(action).toThrow(expect.objectContaining({ code: 'INVALID_INPUT', value }));
	}
});

it('uses PipeError for well-formed but unsupported selections', () => {
	for(const action of [
		() => Steel.availableSizes('mm'), () => new B88('1in', 'unknown'),
		() => new Reducer({ inlet: port, outlet: small, style: 'unknown' }),
		() => new Port({ internalDiameter: '20mm', nominalSize: { system: 'unknown', value: 20 } }),
	]) {
		const error = errorFrom(action);
		expect(error.constructor).toBe(PipeError);
		expect(Object.isFrozen(error.allowedValues)).toBe(true);
	}
	expect(Steel.find({ schedule: 'unknown' })).toEqual([]);
	expect(PE.find({ compound: 'unknown' })).toEqual([]);
});

it('retains precise nested fields, classifications, values and allowed alternatives', () => {
	const invalid = { internalDiameter: new Quantity('-1mm') };
	const error = errorFrom(() => new Component({ kind: 'custom', ports: { inlet: invalid } }));
	expect(error).toBeInstanceOf(PipeRangeError);
	expect(error).toMatchObject({ code: 'INVALID_LENGTH', field: 'ports.inlet.internalDiameter', value: invalid.internalDiameter });
	const badSystem = errorFrom(() => new Elbow({ port: { internalDiameter: new Quantity('20mm'), nominalSize: { system: 'bad', value: 20 } } }));
	expect(badSystem.constructor).toBe(PipeError);
	expect(badSystem.field).toBe('ports.inlet.nominalSize.system');
	expect(badSystem.allowedValues).toContain('DN');
});

it('protects Port dimensions and validates structural ports against the same constraints', () => {
	const port = new Port({ internalDiameter: '20mm' });
	expect(() => { port.internalDiameter = new Quantity('-1mm'); }).toThrow(TypeError);
	expect(new Elbow({ port }).ports.inlet).toBe(port);
	expect(() => new Elbow({ port: { internalDiameter: new Quantity('-1mm') } }))
		.toThrow(expect.objectContaining({ code: 'INVALID_LENGTH', field: 'ports.inlet.internalDiameter' }));
});

it('preserves parser causes for port and fitting dimensions', () => {
	const direct = errorFrom(() => new Port({ internalDiameter: 'not-a-unit' }));
	expect(direct.cause).toBeInstanceOf(Error);
	const nested = errorFrom(() => new Elbow({ port, bendRadius: 'not-a-unit' }));
	expect(nested).toBeInstanceOf(PipeTypeError);
	expect(nested.field).toBe('bendRadius');
	expect(nested.cause).toBeInstanceOf(Error);
});
