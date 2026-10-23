import { describe, expect, it } from 'vitest';
import { Quantity } from '@neutrium/quantity';
import { Pipe, ASME_B36_10_Pipe, PipeComponent as RootPipeComponent, isPipeError } from '@neutrium/pipe';
import { PipeComponent } from '@neutrium/pipe/pipes';
import { Port } from '@neutrium/pipe/connections';
import { positiveLength, nonNegativeLength, finiteNumber } from '@neutrium/pipe/validation';

describe('Pipe component adapter', () => {
	it('adapts a catalogue pipe and retains its specification', () => {
		const pipe = ASME_B36_10_Pipe.fromDN(100, '40');
		const adapter = new PipeComponent(pipe, { connection: 'flanged', nominalSize: { system: 'DN', value: 100 }, metadata: { model: 'P1' } });
		expect(RootPipeComponent).toBe(PipeComponent);
		expect(adapter.kind).toBe('pipe');
		expect(adapter.pipe).toBe(pipe);
		expect(adapter.pipe.schedule).toBe('40');
		expect(adapter.ports.inlet.internalDiameter.eq(pipe.internalDiameter)).toBe(true);
		expect(adapter.ports.outlet).toBe(adapter.ports.inlet);
		expect(adapter.ports.inlet.outerDiameter.eq(pipe.outerDiameter)).toBe(true);
		expect(adapter.ports.inlet.nominalSize).toEqual({ system: 'DN', value: 100 });
		expect(adapter.ports.inlet.connection).toBe('flanged');
		expect(adapter.metadata).toEqual({ model: 'P1' });
	});

	it('supports complete custom structural definitions without inheritance', () => {
		const geometry = new Pipe('100mm', '5mm');
		const custom = { ...geometry, internalDiameter: geometry.internalDiameter.to('in'), internalCrossSectionalArea: geometry.internalCrossSectionalArea.to('m2'), material: 'custom' };
		const first = new PipeComponent(custom);
		const second = new PipeComponent(custom);
		expect(first.pipe).toBe(second.pipe);
		expect(first.pipe.material).toBe('custom');
		expect(first.ports.inlet.outerDiameter.eq(geometry.outerDiameter)).toBe(true);
		expect(first.ports.inlet.internalDiameter.to('mm').scalar.toNumber()).toBeCloseTo(90, 12);
		expect(Port.fromPipe(custom).internalDiameter.eq(custom.internalDiameter)).toBe(true);
	});

	it.each([
		[{ internalDiameter: new Quantity('1kg') }, 'INVALID_DIMENSION'],
		[{ outerDiameter: new Quantity('1mm') }, 'INVALID_PORT'],
		[{ internalCrossSectionalArea: new Quantity('0m2') }, 'INVALID_GEOMETRY'],
		[{ internalCrossSectionalArea: new Quantity('-1m2') }, 'INVALID_GEOMETRY'],
		[{ internalCrossSectionalArea: new Quantity(Infinity, 'm2') }, 'INVALID_GEOMETRY'],
		[{ internalCrossSectionalArea: new Quantity('1m') }, 'INVALID_DIMENSION'],
		[{ internalCrossSectionalArea: '1m2' }, 'INVALID_INPUT'],
		[{ internalDiameter: '10mm' }, 'INVALID_INPUT'],
	])('validates custom geometry %o', (override, code) => {
		const pipe = new Pipe('100mm', '5mm');
		expect(() => new PipeComponent({ ...pipe, ...override }))
			.toThrow(expect.objectContaining({ code }));
	});

	const fields = ['internalDiameter', 'outerDiameter', 'wallThickness', 'internalCrossSectionalArea', 'externalCrossSectionalArea', 'materialCrossSectionalArea'];
	it.each(fields)('requires %s before adopting custom pipe data', field => {
		const custom = { ...new Pipe('100mm', '5mm') };
		delete custom[field];
		expect(() => new PipeComponent(custom)).toThrow(expect.objectContaining({ code: 'INVALID_INPUT', field }));
		expect(Object.isFrozen(custom)).toBe(false);
	});

	it.each(['wallThickness', 'externalCrossSectionalArea', 'materialCrossSectionalArea'])('validates the units and range of %s', field => {
		const geometry = new Pipe('100mm', '5mm');
		const unit = field === 'wallThickness' ? 'mm' : 'mm2';
		for(const value of [0, -1, Infinity, NaN]) {
			const custom = { ...geometry, [field]: new Quantity(value, unit) };
			expect(() => new PipeComponent(custom)).toThrow(expect.objectContaining({
				code: field === 'wallThickness' ? 'INVALID_LENGTH' : 'INVALID_GEOMETRY', field,
			}));
			expect(Object.isFrozen(custom)).toBe(false);
		}
		expect(() => new PipeComponent({ ...geometry, [field]: new Quantity('1kg') }))
			.toThrow(expect.objectContaining({ code: 'INVALID_DIMENSION', field }));
		expect(() => new PipeComponent({ ...geometry, [field]: '1' + unit }))
			.toThrow(expect.objectContaining({ code: 'INVALID_INPUT', field }));
	});

	it('allows extensions to initialise additional fields', () => {
		class TaggedPipe extends PipeComponent {
			model = 'custom';
		}
		expect(new TaggedPipe(new Pipe('10mm', '1mm')).model).toBe('custom');
	});
});

describe('Public extension validation helpers', () => {
	it('preserves units and accepts Quantity inputs', () => {
		const original = new Quantity('1in');
		const length = positiveLength(original, 'meshSize', 'Mesh size');
		expect(length).not.toBe(original);
		expect(length.units()).toBe('in');
		expect(length.eq('25.4mm')).toBe(true);
		expect(nonNegativeLength('0mm').eq(0)).toBe(true);
		expect(nonNegativeLength('2cm').eq('20mm')).toBe(true);
	});

	it.each([
		['bad', 'INVALID_INPUT'], ['1kg', 'INVALID_DIMENSION'], ['1', 'INVALID_DIMENSION'],
		['-1mm', 'INVALID_LENGTH'], [new Quantity(NaN, 'm'), 'INVALID_LENGTH'],
		[new Quantity(Infinity, 'm'), 'INVALID_LENGTH'],
	])('provides structured errors for invalid length %s', (value, code) => {
		for(const validate of [positiveLength, nonNegativeLength]) {
			expect(() => validate(value, 'customField', 'Custom dimension'))
				.toThrow(expect.objectContaining({ code, field: 'customField', value }));
		}
	});

	it('distinguishes positive lengths from non-negative lengths and retains parser causes', () => {
		expect(() => positiveLength('0m')).toThrow(expect.objectContaining({ code: 'INVALID_LENGTH', field: 'length' }));
		try { positiveLength('not a unit'); } catch(error) {
			expect(isPipeError(error)).toBe(true);
			expect(error.cause).toBeInstanceOf(Error);
		}
	});

	it.each([0, -3.5, 1e-12, Number.MAX_VALUE])('accepts finite scalar %s without coercion', value => {
		expect(finiteNumber(value)).toBe(value);
	});
	it.each([NaN, Infinity, -Infinity, '1', null, undefined])('rejects invalid scalar %s', value => {
		expect(() => finiteNumber(value, 'opening')).toThrow(expect.objectContaining({ code: 'INVALID_INPUT', field: 'opening', value }));
		expect(() => finiteNumber(value)).toThrow(typeof value === 'number' ? RangeError : TypeError);
	});
});
