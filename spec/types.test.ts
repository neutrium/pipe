// Compile-only consumer tests against the shipped declarations.
import { Quantity } from '@neutrium/quantity';
import {
	Pipe, ASME_B36_10_Pipe, ASTM_B88_Tube, ASTM_B88M_Tube, ISO_11922_Pipe, BWG_Tube,
	type RawPipe, type ASTMB88Type, type ASTMB88MType, type PECompound,
	type PressureRating, type BWGGauge,
	type ASTMB88SearchOptions, type ASTMB88MSearchOptions, type ISOPipeSearchOptions,
} from '@neutrium/pipe/pipes';
import { isPipeError, PipeTypeError, PipeRangeError, type PipeErrorCode } from '@neutrium/pipe';

const raw: RawPipe = new Pipe("100mm", "6mm").raw("m");
const internalDiameter: number = raw.internalDiameter;
const quantityPipe = new Pipe(new Quantity("100mm"), new Quantity("6mm"));
const materialArea: Quantity = quantityPipe.materialCrossSectionalArea;
const rawMaterialArea: number = quantityPipe.raw().materialCrossSectionalArea;
const internalVolume: Quantity = quantityPipe.internalVolume("2m");
const materialVolume: Quantity = quantityPipe.materialVolume(new Quantity("200cm"));
const internalSurface: Quantity = quantityPipe.internalSurfaceArea("2m");
const externalSurface: Quantity = quantityPipe.externalSurfaceArea("2m");
const materialMass: Quantity = quantityPipe.mass("2m", new Quantity("7850kg/m3"));
const imperialTypes: ASTMB88Type[] = ASTM_B88_Tube.availableTypes();
const metricTypes: ASTMB88MType[] = ASTM_B88M_Tube.availableTypes();
const compounds: PECompound[] = ISO_11922_Pipe.availableCompounds();
const ratings: PressureRating[] = ISO_11922_Pipe.availablePressureRatings();
const gauges: BWGGauge[] = BWG_Tube.availableGauges();
const imperialOptions: ASTMB88SearchOptions = { type: "L" };
const metricOptions: ASTMB88MSearchOptions = { type: "B" };
const peOptions: ISOPipeSearchOptions = { pressureRating: "10", compound: "PE100" };
const imperial: ASTMB88Type = new ASTM_B88_Tube("1in", "L").type;
const metric: ASTMB88MType = new ASTM_B88M_Tube("10mm", "A").type;
const compound: PECompound = new ISO_11922_Pipe("200mm", "10", "PE80").compound;
const gauge: BWGGauge = new BWG_Tube("1in", "16").gauge;
ASME_B36_10_Pipe.find({ sizingSystem: "NPS", minimumInternalDiameter: "1in" });
ASTM_B88_Tube.find(imperialOptions);
ASTM_B88M_Tube.find(metricOptions);
ISO_11922_Pipe.find(peOptions);

// @ts-expect-error A bare number has no length units.
new Pipe("100mm", 6);
// @ts-expect-error Metric and imperial copper grades are distinct.
new ASTM_B88_Tube("1in", "A");
// @ts-expect-error Metric and imperial copper grades are distinct.
new ASTM_B88M_Tube("10mm", "K");
// @ts-expect-error Unknown PE compound.
new ISO_11922_Pipe("200mm", "10", "PE50");
// @ts-expect-error PN is a string designation from the supported set.
new ISO_11922_Pipe("200mm", "99");
// @ts-expect-error Unknown BWG gauge.
new BWG_Tube("1in", "100");
// @ts-expect-error Invalid grades are also rejected in searches.
ASTM_B88_Tube.find({ type: "X" });
// @ts-expect-error Invalid compounds are also rejected in searches.
ISO_11922_Pipe.find({ compound: "PE50" });
// @ts-expect-error BWG searches require an outer internalDiameter.
BWG_Tube.find({ minimumInternalDiameter: "1mm" });
// @ts-expect-error raw() returns numbers, not Quantity objects.
raw.internalDiameter.scalar;
// @ts-expect-error Length inputs require units.
quantityPipe.internalVolume(2);
// @ts-expect-error Material density inputs require units.
quantityPipe.mass("2m", 7850);

function inspectError(error: unknown): void {
	if(isPipeError(error)) {
		const code: PipeErrorCode = error.code;
		const field: string = error.field;
		const rejected: unknown = error.value;
		const alternatives: readonly (string | number)[] = error.allowedValues;
		// @ts-expect-error Alternative lists must not be mutated.
		error.allowedValues.push("other");
	}
	if(error instanceof PipeTypeError) {
		const builtIn: TypeError = error;
	}
	if(error instanceof PipeRangeError) {
		const builtIn: RangeError = error;
	}
}

// Public component entry points and third-party extension contracts.
import { Port, type PortDefinition } from '@neutrium/pipe/connections';
import { Component, TwoPortComponent, type ComponentDefinition } from '@neutrium/pipe/components';
import { Elbow, Tee, Reducer } from '@neutrium/pipe/fittings';
import { Valve } from '@neutrium/pipe/valves';

const port = Port.fromPipe(quantityPipe, { nominalSize: { system: 'DN', value: 100 } });
const structuralPort: PortDefinition = { internalDiameter: new Quantity('20mm') };
const elbow = new Elbow({ port, angle: 90 });
const tee = new Tee({ run: port, branch: structuralPort });
new Reducer({ inlet: port, outlet: structuralPort });
new Valve({ valveType: 'custom-valve', inlet: port });

class Strainer extends TwoPortComponent {
	readonly meshSize: Quantity;
	constructor(connection: PortDefinition, meshSize: Quantity) {
		super({ kind: 'strainer', inlet: connection });
		this.meshSize = meshSize;
	}
}

interface ManifoldPorts { supply: PortDefinition; drain: PortDefinition; vent: PortDefinition }
class Manifold extends Component<ManifoldPorts> {
	readonly model = 'M1';
	constructor() {
		super({ kind: 'manifold', ports: { supply: port, drain: structuralPort, vent: structuralPort } });
	}
}
// Interface-only implementations need no inheritance or registration.
const custom: ComponentDefinition<{ customPort: PortDefinition }> = {
	kind: 'my-component', ports: { customPort: structuralPort },
};
const definitions: ComponentDefinition[] = [elbow, tee, new Strainer(port, new Quantity('1mm')), new Manifold(), custom];
const customPort = new Component({ kind: 'custom', ports: { connection: { ...structuralPort, coating: 'PTFE' } } }).ports.connection;
const coating: string = customPort.coating;
// @ts-expect-error Port names remain specific to the component.
elbow.ports.branch;
// @ts-expect-error Port mappings are readonly.
tee.ports.branch = port;
// @ts-expect-error A port definition uses Quantity dimensions; Port handles string parsing.
new Elbow({ port: { internalDiameter: '20mm' } });
// @ts-expect-error Nominal designations require a known sizing system.
new Port({ internalDiameter: '20mm', nominalSize: { system: 'metric', value: 20 } });

import type { PipeDefinition } from '@neutrium/pipe';
import { PipeComponent } from '@neutrium/pipe/pipes';
import { positiveLength, nonNegativeLength, finiteNumber } from '@neutrium/pipe/validation';

const physicalPipe: PipeDefinition = quantityPipe;
const customPipe = { ...quantityPipe, model: 'custom' } satisfies PipeDefinition & { model: string };
const requiredOuterDiameter: Quantity = physicalPipe.outerDiameter;
const requiredWallThickness: Quantity = physicalPipe.wallThickness;
const requiredExternalArea: Quantity = physicalPipe.externalCrossSectionalArea;
const requiredMaterialArea: Quantity = physicalPipe.materialCrossSectionalArea;
type SameKeys<A, B> = [keyof A] extends [keyof B] ? [keyof B] extends [keyof A] ? true : false : false;
const matchingGeometryFields: SameKeys<PipeDefinition, RawPipe> = true;
// @ts-expect-error All six geometry fields are required in custom definitions.
const incompletePipe: PipeDefinition = { internalDiameter: quantityPipe.internalDiameter, internalCrossSectionalArea: quantityPipe.internalCrossSectionalArea };
// @ts-expect-error All six geometry fields are required in raw snapshots.
const incompleteRaw: RawPipe = { internalDiameter: 90, internalCrossSectionalArea: 6361.7 };
// @ts-expect-error Shared definition geometry is readonly.
physicalPipe.wallThickness = new Quantity('1mm');
const adaptedPipe = new PipeComponent(customPipe);
const retainedModel: string = adaptedPipe.pipe.model;
const adaptedDefinition: ComponentDefinition = adaptedPipe;
const optionalOuterDiameter: Quantity | undefined = adaptedPipe.ports.inlet.outerDiameter;
const customConnection = Port.fromPipe(customPipe);
// A connection still needs only bore geometry, even though a pipe definition is complete.
Port.fromPipe({ internalDiameter: quantityPipe.internalDiameter });
const positive: Quantity = positiveLength('1mm', 'meshSize');
const nonNegative: Quantity = nonNegativeLength(new Quantity('0m'), 'length');
const scalar: number = finiteNumber(0.5, 'opening');
// @ts-expect-error Custom pipes must supply their flow area.
new PipeComponent({ internalDiameter: quantityPipe.internalDiameter });
// @ts-expect-error Definitions use Quantity objects, not bare scalar dimensions.
const badPipe: PipeDefinition = { internalDiameter: 10, internalCrossSectionalArea: 20 };
// @ts-expect-error Known port names are retained for the adapter.
adaptedPipe.ports.branch;
// @ts-expect-error Unitless numbers are not length inputs.
positiveLength(10);
// @ts-expect-error Finite scalar validation does not coerce strings.
finiteNumber('1');

// Numeric schedules are accepted at every input boundary; outputs stay strings.
const numericSchedule: string = new ASME_B36_10_Pipe('100mm', 40).schedule;
const numericDNSchedule: string = ASME_B36_10_Pipe.fromDN(100, 40).schedule;
const numericNPSSchedule: string = ASME_B36_10_Pipe.fromNPS(4, 40).schedule;
const numericScheduleMatches: ASME_B36_10_Pipe[] = ASME_B36_10_Pipe.find({ schedule: 40 });
const numericScheduleSizes: number[] = ASME_B36_10_Pipe.availableSizes('DN', 40);
// @ts-expect-error Schedule inputs are strings or numbers, not booleans.
ASME_B36_10_Pipe.fromDN(100, true);

// Canonical names work across feature entry points and structural implementations.
import type { NominalSize } from '@neutrium/pipe/connections';
const designation: NominalSize = new ASTM_B88M_Tube('22mm', 'B').nominalSize;
const canonicalPort: PortDefinition = new Port({ internalDiameter: '20mm' });
const canonicalPortDiameter: Quantity = canonicalPort.internalDiameter;
const canonicalPressure: PressureRating = new ISO_11922_Pipe('200mm', '10').pressureRating;
ISO_11922_Pipe.find({ pressureRating: '10' });
const canonicalGauge: BWGGauge = new BWG_Tube('1in', '16').gauge;
// @ts-expect-error Canonical structural port dimensions are required.
const oldStructuralPort: PortDefinition = { diameter: new Quantity('20mm') };
// @ts-expect-error A canonical port must specify an internal diameter.
new Port({ outerDiameter: '20mm' });
// @ts-expect-error Pressure rating remains a typed string designation.
ISO_11922_Pipe.find({ pressureRating: 10 });

// Read-only declarations cover fields, catalogue rows and adopted custom data.
// @ts-expect-error Geometry cannot be reassigned.
quantityPipe.internalDiameter = new Quantity('1mm');
// @ts-expect-error Unspecified optional fields are also readonly.
port.outerDiameter = new Quantity('30mm');
// @ts-expect-error Custom port properties are readonly after attachment.
customPort.coating = 'steel';
// @ts-expect-error Custom pipe properties are readonly after attachment.
adaptedPipe.pipe.model = 'changed';
// @ts-expect-error The static catalogue reference cannot be replaced.
ASTM_B88_Tube.OD_DATA = [];
// @ts-expect-error Catalogue arrays cannot be extended.
ASTM_B88M_Tube.OD_DATA.push(400);
// @ts-expect-error Nested catalogue rows cannot be changed.
ASTM_B88_Tube.WT_DATA.L[0] = 1;
// @ts-expect-error Nested catalogue records cannot be changed.
ISO_11922_Pipe.SDR_DATA.PE100['10'] = 99;
// @ts-expect-error Gauge values cannot be changed.
BWG_Tube.BWG_DATA['16'] = 99;
// @ts-expect-error Component properties cannot be reassigned.
elbow.angle = 45;

import type { DeepReadonly } from '@neutrium/pipe';
const dataComponent = new Component({ kind: 'custom', ports: {
	connection: { internalDiameter: new Quantity('20mm'), coating: { layers: ['PTFE'] }, label() { return 'custom'; } },
} });
// @ts-expect-error Adopted custom data is recursively readonly.
dataComponent.ports.connection.coating.layers.push('steel');
const label: string = dataComponent.ports.connection.label();
const converted: Quantity = dataComponent.ports.connection.internalDiameter.to('m');
const readonlyDefinition: DeepReadonly<typeof customPipe> = adaptedPipe.pipe;
// Detached outputs remain mutable.
raw.internalDiameter = 0;
numericScheduleSizes.push(100);
numericScheduleMatches.splice(0);

// Symbol keys cannot name ports, including on inferred and explicit maps.
import type { ComponentOptions, PortMap } from '@neutrium/pipe/components';
const symbolPort = Symbol('outlet');
const symbolPorts = { inlet: structuralPort, [symbolPort]: structuralPort };
// @ts-expect-error Inferred maps must reject symbol-named ports.
new Component({ kind: 'custom', ports: symbolPorts });
// @ts-expect-error Explicit maps must reject symbol-named ports.
type InvalidComponent = Component<typeof symbolPorts>;
// @ts-expect-error Structural component contracts have the same restriction.
type InvalidDefinition = ComponentDefinition<typeof symbolPorts>;
// @ts-expect-error Options have the same restriction.
type InvalidOptions = ComponentOptions<typeof symbolPorts>;
// @ts-expect-error The default map must not erase symbol-keyed definitions.
const invalidPortMap: PortMap = symbolPorts;
const namedPorts: PortMap = { inlet: structuralPort, outlet: port };
new Component({ kind: 'custom', ports: namedPorts });
// Numeric JavaScript property names become strings at runtime.
new Component({ kind: 'numbered', ports: { 1: structuralPort } });

// Deprecated API names were removed in version 3.
// @ts-expect-error Use internalDiameter.
quantityPipe.id;
// @ts-expect-error Raw snapshots expose canonical dimensions only.
quantityPipe.raw().id;
// @ts-expect-error Use internalDiameter in Port options.
new Port({ diameter: '20mm' });
// @ts-expect-error Removed aliases cannot accompany canonical options.
new Port({ internalDiameter: '20mm', diameter: '20mm' });
// @ts-expect-error Use internalDiameter on Port instances.
canonicalPort.diameter;
// @ts-expect-error Use pressureRating in search filters.
ISO_11922_Pipe.find({ pn: '10' });
// @ts-expect-error Use pressureRating.
new ISO_11922_Pipe('200mm', '10').pn;
// @ts-expect-error Use standardDimensionRatio.
new ISO_11922_Pipe('200mm', '10').sdr;
// @ts-expect-error Use NOMINAL_SIZE_DATA.
ISO_11922_Pipe.NPS_DATA;
// @ts-expect-error Use gauge.
new BWG_Tube('1in', '16').bwg;
// @ts-expect-error Copper uses nominalSize.value and nominalSize.system.
new ASTM_B88_Tube('1in', 'K').nps;
// @ts-expect-error Copper uses nominalSize.value and nominalSize.system.
new ASTM_B88M_Tube('22mm', 'B').nps;
