import { Quantity } from '@neutrium/quantity';
import { Component, TwoPortComponent, PipeComponent, Pipe, Port, Elbow, Tee, Reducer, Valve,
	type ComponentMetadata, type ComponentMetadataValue } from '@neutrium/pipe';
import type { ComponentMetadataValue as ComponentValue } from '@neutrium/pipe/components';

const symbolKey = Symbol('source');
const values: readonly ComponentMetadataValue[] = [
	'text', 1, true, 10n, Symbol('tag'), null, undefined,
	new Quantity('10mm'), ['nested', { valid: true }], { nested: { dimension: new Quantity('2m') } },
];
const metadata = { model: 'V1', nested: { values }, [symbolKey]: { source: 'custom' } } satisfies ComponentMetadata;
const input = { nested: { labels: ['editable'] } };
const inlet = new Port({ internalDiameter: '20mm' });
const outlet = new Port({ internalDiameter: '10mm' });
const component = new Component({ kind: 'custom', ports: { inlet }, metadata: input });
input.nested.labels.push('still editable');
new Component({ kind: 'custom', ports: { inlet }, metadata });
new TwoPortComponent({ kind: 'custom', inlet, metadata });
new PipeComponent(new Pipe('25mm', '2mm'), { metadata });
new Elbow({ port: inlet, metadata });
new Tee({ run: inlet, metadata });
new Reducer({ inlet, outlet, metadata });
new Valve({ valveType: 'ball', inlet, metadata });

// Recursive records and readonly tuples are supported, including cycles.
const cycle: { self?: ComponentMetadata } = {};
cycle.self = cycle;
const cyclic: ComponentMetadata = cycle;
const tuple: ComponentMetadataValue = ['label', 1, new Quantity('10mm')] as const;
const fromComponent: ComponentValue = metadata;
const fromRoot: ComponentMetadataValue = fromComponent;
const dimension: ComponentMetadataValue = new Quantity('1m');

if(dimension instanceof Quantity)
{
	const converted: Quantity = dimension.to('mm');
}

// Each branch of the recursive value is checked at any depth.
// @ts-expect-error Functions are not metadata values.
const callback: ComponentMetadata = { callback: () => 1 };
// @ts-expect-error Date instances must be converted to data, e.g. ISO strings.
const date: ComponentMetadata = { nested: { date: new Date() } };
// @ts-expect-error Maps are not plain metadata records.
const map: ComponentMetadata = { nested: [new Map<string, string>()] };
// @ts-expect-error Sets are not supported metadata containers.
const set: ComponentMetadata = { value: new Set<number>() };
// @ts-expect-error Typed arrays are not ordinary metadata arrays.
const typedArray: ComponentMetadata = { value: new Uint8Array([1]) };
// @ts-expect-error Promises are not metadata values.
const promise: ComponentMetadata = { value: Promise.resolve('x') };
// @ts-expect-error Symbol-keyed values follow the same rules.
const symbolCallback: ComponentMetadata = { [symbolKey]: () => 1 };
// @ts-expect-error Metadata must have a record at the top level.
const array: ComponentMetadata = ['label'];
// @ts-expect-error Metadata must have a record at the top level.
const quantity: ComponentMetadata = new Quantity('10mm');
// @ts-expect-error Metadata must have a record at the top level.
const scalar: ComponentMetadata = 'label';
// @ts-expect-error Metadata must have a record at the top level.
const nullMetadata: ComponentMetadata = null;
declare const unvalidated: unknown;
// @ts-expect-error Unknown external data must be narrowed before use.
const unknownMetadata: ComponentMetadata = { value: unvalidated };

// Options inherit the recursive constraint across all component families.
// @ts-expect-error Base components reject nested functions at compile time.
new Component({ kind: 'custom', ports: { inlet }, metadata: { nested: [() => 1] } });
// @ts-expect-error Two-port components use the same metadata contract.
new TwoPortComponent({ kind: 'custom', inlet, metadata: { value: new Date() } });
// @ts-expect-error Pipe adapters use the same metadata contract.
new PipeComponent(new Pipe('25mm', '2mm'), { metadata: { value: new Date() } });
// @ts-expect-error Elbows use the same metadata contract.
new Elbow({ port: inlet, metadata: { value: new Date() } });
// @ts-expect-error Tees use the same metadata contract.
new Tee({ run: inlet, metadata: { value: new Date() } });
// @ts-expect-error Reducers use the same metadata contract.
new Reducer({ inlet, outlet, metadata: { value: new Date() } });
// @ts-expect-error Valves use the same metadata contract.
new Valve({ valveType: 'ball', inlet, metadata: { value: new Date() } });

declare const snapshot: ComponentMetadata;
// @ts-expect-error Snapshot records are readonly.
snapshot.model = 'changed';
// @ts-expect-error Snapshot arrays are readonly.
(snapshot.values as readonly ComponentMetadataValue[]).push('changed');
// @ts-expect-error Nested snapshot records are readonly.
(snapshot.nested as ComponentMetadata).model = 'changed';
// @ts-expect-error Symbol-keyed snapshot properties are readonly.
snapshot[symbolKey] = 'changed';

// TypeScript cannot distinguish a getter or an erased class instance from a
// structurally matching record. Runtime snapshot validation remains necessary.
const accessor: ComponentMetadata = { get label() { return 'value'; } };
class Data { label = 'value'; }
const erased: { label: string } = new Data();
const structurallyValid: ComponentMetadata = erased;
