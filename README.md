# Neutrium.pipe

Create pipe, tube, fitting, and valve definitions for engineering applications. Calculate geometry with units, select dimensions from standard catalogues, and share physical component definitions across your piping model.

[API reference](https://neutrium.github.io/pipe/) · [Interactive demo](https://neutrium.github.io/pipe/demo/)

## Getting started

Requires Node.js 24 or newer. The package uses ES modules and includes TypeScript
declarations. Browser applications need a bundler that resolves npm dependencies.

```sh
npm install @neutrium/pipe
```
Then:

```ts
import { Pipe } from '@neutrium/pipe';

const pipe = new Pipe('100mm', '6mm'); // Outer diameter and wall thickness

console.log(pipe.internalDiameter.to('mm').scalar.toNumber()); // 88
console.log(pipe.internalVolume('2m').to('L').scalar.toNumber()); // About 12.16
console.log(pipe.mass('2m', '7850kg/m3').to('kg').scalar.toNumber()); // About 27.82
```

Dimensions accept strings with units or `Quantity` objects from `@neutrium/quantity`. Results are  Quantities, so you can convert units with `to()` and extract a JavaScript number with `scalar.toNumber()`.

## Using a pipe or tube

```ts
import {
    ASME_B36_10_Pipe,
    ASTM_B88_Tube,
    ASTM_B88M_Tube,
    ISO_11922_Pipe,
    BWG_Tube,
} from '@neutrium/pipe/pipes';

const steel = ASME_B36_10_Pipe.fromDN(100, '40');
const sameSteel = ASME_B36_10_Pipe.fromNPS(4, '40');
const copper = new ASTM_B88_Tube('1in', 'K');
const metricCopper = new ASTM_B88M_Tube('22mm', 'A');
const polyethylene = new ISO_11922_Pipe('200mm', '10', 'PE80');
const gaugeTube = new BWG_Tube('1in', '16');
```

| Class | Selection | Additional properties |
| --- | --- | --- |
| `ASME_B36_10_Pipe` | DN or NPS designation and schedule | `dn`, `nps`, `schedule`, `nominalSize` |
| `ASTM_B88_Tube` | Nominal inch size and type `K`, `L`, or `M` | `type`, `nominalSize` |
| `ASTM_B88M_Tube` | Metric designation and type `A`, `B`, or `C` | `type`, `nominalSize` |
| `ISO_11922_Pipe` | Metric size, pressure rating string, and compound (`PE100` by default) | `pressureRating`, `compound`, `standardDimensionRatio`, `nominalSize` |
| `BWG_Tube` | Actual outer diameter and gauge string | `gauge` |

Nominal sizes are designations, not measured diameters: DN100 and NPS4 identify the same steel pipe. Prefer `fromDN()` and `fromNPS()` to make that choice explicit. They return dimensions in millimetres and inches respectively.

Select an exact supported designation; catalogue constructors reject unsupported sizes and combinations. Schedules accept strings or numbers, such as `'40'` or `40`. Pressure ratings and gauges use strings, such as `'10'` and `'16'`.

The PE wall table covers AS/NZS 4130 Series 1 dimensions under the historical class name `ISO_11922_Pipe`. Catalogue availability describes the bundled data, not manufacturer stock or certification. See the [catalogue data guide](guides/catalogue-data.md) for reference sources and verification coverage.

## Working with geometry

All pipe and tube classes expose the same geometry:

| Property | Meaning |
| --- | --- |
| `outerDiameter` | Actual outside diameter |
| `internalDiameter` | Bore diameter |
| `wallThickness` | Pipe wall thickness |
| `internalCrossSectionalArea` | Bore area |
| `externalCrossSectionalArea` | Area enclosed by the outer diameter |
| `materialCrossSectionalArea` | Pipe wall area, excluding the bore |

Outer diameter and wall thickness retain their supplied units. Calculated internal diameter and areas use the outer diameter's units. Mixed input units are supported.

```ts
import { Pipe } from '@neutrium/pipe';
import { Quantity } from '@neutrium/quantity';

const pipe = new Pipe('100mm', new Quantity('0.6cm'));

pipe.internalDiameter.to('in');
pipe.materialCrossSectionalArea.to('cm2');
pipe.internalVolume('2m').to('L');
pipe.materialVolume('2m').to('m3');
pipe.internalSurfaceArea('2m').to('m2');
pipe.externalSurfaceArea('2m').to('m2');
pipe.mass('2m', '7850kg/m3').to('kg');
```

Pipe diameters and wall thickness must be finite, positive lengths, with wall thickness less than half the outer diameter. Segment lengths may be zero; material density must be finite and positive, with mass-per-volume units. Surface areas exclude end faces. Mass includes the pipe wall only.

### Numeric snapshots

Use `raw(unit)` when passing geometry to calculations that use ordinary JavaScript numbers. Lengths use the requested unit; areas use its square. Omitting the unit uses the outer diameter's units.

```ts
const geometry = pipe.raw('m');

geometry.internalDiameter; // 0.088
geometry.outerDiameter;    // 0.1
geometry.wallThickness;    // 0.006
geometry.internalCrossSectionalArea; // m²
```

The snapshot contains all six geometry properties and is detached from the pipe. Editing it does not change the original definition.

## Finding catalogue sizes

Use `available*()` methods to populate size and grade selectors:

```ts
import {
    ASME_B36_10_Pipe,
    ASTM_B88_Tube,
    ISO_11922_Pipe,
    BWG_Tube,
} from '@neutrium/pipe/pipes';

ASME_B36_10_Pipe.availableSizes('NPS', '40');
ASME_B36_10_Pipe.availableSchedules(100, 'DN');
ASTM_B88_Tube.availableTypes(0.25);
ISO_11922_Pipe.availablePressureRatings(200, 'PE80');
BWG_Tube.availableGauges('1in');
```

Each catalogue class also provides `find(options)`. Results are pipe instances ordered by internal diameter, smallest first. `minimumInternalDiameter` is an inclusive lower bound; omit it to find all combinations matching the other filters.

```ts
const candidates = ASME_B36_10_Pipe.find({
    schedule: '40',
    minimumInternalDiameter: '100mm',
});

const smallest = candidates[0];
if (smallest) {
    console.log(smallest.dn, smallest.internalDiameter.to('mm').scalar.toNumber());
}

const polyethylene = ISO_11922_Pipe.find({
    compound: 'PE80',
    pressureRating: '10',
    minimumInternalDiameter: '150mm',
});
```

Well-formed filters with no matches return `[]`. Malformed filters or incompatible units throw a structured error. Use the [API reference](https://neutrium.github.io/pipe/) for each catalogue's search options and discovery methods.

## Fittings, valves, and connections

A component describes physical equipment with a `kind` and named `ports`. Use `Port` for a connection, or `Port.fromPipe()` to copy a pipe's actual dimensions. Pass a nominal designation explicitly when you want to retain it.

```ts
import { ASME_B36_10_Pipe } from '@neutrium/pipe/pipes';
import { Port } from '@neutrium/pipe/connections';
import { Elbow, Tee, Reducer } from '@neutrium/pipe/fittings';
import { Valve } from '@neutrium/pipe/valves';

const pipe = ASME_B36_10_Pipe.fromDN(100, '40');
const connection = Port.fromPipe(pipe, {
    nominalSize: pipe.nominalSize,
    connection: 'flanged',
});
const branch = new Port({ internalDiameter: '50mm' });

const elbow = new Elbow({ port: connection, angle: 90, bendRadius: '150mm' });
const tee = new Tee({ run: connection, branch });
const reducer = new Reducer({ inlet: connection, outlet: branch, style: 'concentric' });
const valve = new Valve({ valveType: 'ball', inlet: connection, boreDiameter: '80mm' });

console.log(elbow.ports.inlet.internalDiameter);
```

| Definition | Ports | Options |
| --- | --- | --- |
| `Elbow` | `inlet`, `outlet` | Angle in degrees (default 90), optional centreline bend radius |
| `Tee` | `run1`, `run2`, `branch` | Branch angle in degrees (default 90); branch defaults to the run port |
| `Reducer` | `inlet`, `outlet` | `concentric` or `eccentric` style, optional length; port bores must differ |
| `Valve` | `inlet`, `outlet` | Valve type, optional bore diameter and face-to-face length; outlet defaults to inlet |

Connection and valve type identifiers are open strings. Unspecified dimensions remain undefined. Nominal sizes and connection labels alone do not establish mechanical compatibility.

### Pipe definitions and component adapters

Use `PipeComponent` to expose a pipe through the same inlet/outlet interface as fittings and valves:

```ts
import { Pipe, PipeComponent } from '@neutrium/pipe/pipes';

const component = new PipeComponent(new Pipe('100mm', '5mm'));

component.ports.inlet.internalDiameter;
component.pipe.internalCrossSectionalArea;
```

Custom geometry can implement `PipeDefinition`, whose six geometry fields are readonly Quantities. Consumers can accept `ComponentDefinition` for equipment with a `kind` and named ports, without requiring inheritance from a library class.

### Creating custom components

Extend `TwoPortComponent` for inline equipment or `Component<YourPortMap>` for other port arrangements. Use the public validation helpers for custom dimensions.

```ts
import { Quantity } from '@neutrium/quantity';
import { TwoPortComponent } from '@neutrium/pipe/components';
import type { PortDefinition } from '@neutrium/pipe/connections';
import { positiveLength } from '@neutrium/pipe/validation';

class Strainer extends TwoPortComponent {
    readonly meshSize: Quantity;

    constructor(port: PortDefinition, meshSize: string | Quantity) {
        const validatedMeshSize = positiveLength(meshSize, 'meshSize', 'Mesh size');
        super({ kind: 'strainer', inlet: port });
        this.meshSize = validatedMeshSize;
    }
}
```

Validate custom options before calling `super()`, because successful component construction freezes the supplied port definitions. Custom subclasses are responsible for protecting their own additional fields.

## Handling invalid input

Use `isPipeError()` to recognise library validation errors and inspect `code`, `field`, `value`, and `allowedValues`. Parser failures also retain `cause`.

```ts
import { ASME_B36_10_Pipe, isPipeError } from '@neutrium/pipe';

try {
    ASME_B36_10_Pipe.fromDN(100, 'unknown');
} catch (error: unknown) {
    if (isPipeError(error)) {
        console.log(error.code, error.field);
        console.log(error.allowedValues);
    } else {
        throw error;
    }
}
```

| Error | Meaning |
| --- | --- |
| `PipeTypeError` | Wrong input type, malformed value, or incompatible units |
| `PipeRangeError` | Non-finite or out-of-range number, or impossible geometry |
| `PipeError` | Well-formed but unsupported selection |

Optional defaults apply to omitted values or `undefined`; `null` is rejected.
Use error codes and fields for programmatic handling instead of matching messages.

### Public validation helpers

Import `positiveLength`, `nonNegativeLength`, `finiteNumber`, `lengthQuantity`, and `densityQuantity` from `@neutrium/pipe/validation` for custom components. Length and density helpers parse strings or Quantities; `finiteNumber` checks a JavaScript number without coercion. The helpers throw the same structured errors as the built-in classes.

## Public entry points

Import from `@neutrium/pipe` for the complete API, or choose a focused feature path:

| Entry point | Use |
| --- | --- |
| `@neutrium/pipe/pipes` | Pipe and tube classes, catalogue searches, `PipeComponent`, `PipeDefinition`, `RawPipe` |
| `@neutrium/pipe/connections` | `Port`, connection options, `PortDefinition`, `NominalSize` |
| `@neutrium/pipe/components` | Component base classes, component contracts, metadata types |
| `@neutrium/pipe/fittings` | `Elbow`, `Tee`, `Reducer`, and their options |
| `@neutrium/pipe/valves` | `Valve` and its options |
| `@neutrium/pipe/validation` | Dimension and number validation helpers |
| `@neutrium/pipe/errors` | Error classes, error types, and `isPipeError` |

Import types from their owning feature path or the root:

```ts
import { Valve, type ValveOptions } from '@neutrium/pipe/valves';
import type { PortDefinition } from '@neutrium/pipe/connections';
```

## Guides and reference

- [API reference](https://neutrium.github.io/pipe/): constructors, properties, options, and types.
- [Interactive demo](https://neutrium.github.io/pipe/demo/): explore catalogue dimensions and geometry.
- [Catalogue data](guides/catalogue-data.md): dimensional sources and verification coverage.
- [Migrating to version 3](guides/migrating-v3.md).
- [Migrating to version 2](guides/migrating-v2.md).
- [Development and releases](guides/development.md): tests, benchmarks, documentation builds, and publishing.

## License

## Overview

This project is licensed under the MIT License, see the [LICENCE](./LICENCE) file for details.

You are free to:

- Use this plugin for personal or commercial purposes
- Modify and distribute the code
- Include it in other projects

Under the following conditions:

- You must include the original license and copyright notice

### Disclaimer

This library is provided "as is", without warranty of any kind. Use at your own risk.