# Migrating to version 3

Version 3 is a major release because it changes the runtime requirements, import paths, validation behavior and ownership of shared definitions. Use the migration steps below when upgrading from version 2.

## Runtime and imports

Use Node.js 24 or newer and ES module imports.  Applications that use CommonJS can load the library with asynchronous `import()`. Browser applications need a bundler to resolve npm dependencies. Update direct uses of `@neutrium/quantity` to version 6; it uses `@neutrium/decimal` for decimal arithmetic. Replace `scalar.toSignificantDigits(digits)` with `scalar.toSD(digits)`.

Replace per-class and internal deep imports with named imports from the root or one of the [public feature entry points](../README.md#public-entry-points). Paths under `dist/`, `src/`, and individual class modules are not exported.

```ts
import { Pipe, ASME_B36_10_Pipe } from '@neutrium/pipe/pipes';
import { Port } from '@neutrium/pipe/connections';
import { Valve } from '@neutrium/pipe/valves';
import { Quantity } from '@neutrium/quantity';

const pipe = ASME_B36_10_Pipe.fromDN(100, 40);
const connection = Port.fromPipe(pipe);
const valve = new Valve({ valveType: 'ball', inlet: connection });
```

## Feature entry points

**Migration:** `PipeComponent` and `PipeComponentOptions` have moved from `components` to `pipes`. Shared type re-exports have been removed from unrelated features. Use these owning entry points, or import any of these types from `@neutrium/pipe`:

| Types | Owning feature | Removed re-export locations |
|:------|:---------------|:----------------------------|
| `PipeDefinition` | `pipes` | `connections`, `components` |
| `PipeComponent`, `PipeComponentOptions` | `pipes` | `components` |
| `PortDefinition` | `connections` | `components`, `fittings`, `valves` |
| `PortDetails` | `connections` | `components` |
| `NominalSize` | `connections` | `pipes`, `components`, `fittings`, `valves` |
| `ComponentDefinition`, `ComponentMetadata`, `ComponentMetadataValue`, `TwoPortMap`, `DeepReadonly` | `components` | `fittings`, `valves` |

## Names and catalogue selection

Version 3 removes the deprecated API names below. Update property access, raw geometry snapshots, constructor options and search filters to the canonical names. Custom structural definitions must also provide the canonical fields.

| Removed API | Replacement |
|:--------------|:---------------|
| `id`, `od`, `wt` | `internalDiameter`, `outerDiameter`, `wallThickness` |
| `icsa`, `ecsa`, `mcsa` | `internalCrossSectionalArea`, `externalCrossSectionalArea`, `materialCrossSectionalArea` |
| Port property and constructor option `diameter` | `internalDiameter` |
| PE property and search option `pn`; property `sdr` | `pressureRating`; `standardDimensionRatio` |
| BWG `bwg` | `gauge` |
| Copper `nps` | `nominalSize.value` with `nominalSize.system` |
| `ISO_11922_Pipe.NPS_DATA` | `ISO_11922_Pipe.NOMINAL_SIZE_DATA` (millimetres) |

The six short geometry properties are removed from every pipe/tube class and from `raw()` results. ASME steel `dn` and `nps` remain supported; only the copper `nps` alias is removed. Valid BWG gauge spellings such as `00` and `2/0` also remain.

JavaScript callers using removed `diameter` or `pn` input options receive a `PipeTypeError`, even when the  canonical option is also supplied or the removed option is `undefined`. The error identifies `diameter` (`INVALID_PORT`) or `pn` (`INVALID_PRESSURE_RATING`). TypeScript no longer declares these options. Replace `new Port({ diameter: '20mm' })` with `new Port({ internalDiameter: '20mm' })`, and replace `ISO_11922_Pipe.find({ pn: '10' })` with `ISO_11922_Pipe.find({ pressureRating: '10' })`.

Nominal catalogue sizes must match a listed designation after unit conversion; only floating-point conversion noise is tolerated. Select a supported size explicitly rather than relying on rounding to a nearby designation. ASME `fromDN()` and `fromNPS()` factories make the sizing system explicit. Valid numeric ASME schedules such as `40` are accepted and stored as strings such as `'40'`. This does not enable numeric pressure-rating or gauge inputs.

Well-formed catalogue filters with no matches return `[]`; malformed filters still throw. Some catalogue dimensions have been corrected, so calculated bores, areas and volumes can differ from version 2. Review the [catalogue audit](catalogue-data.md) before updating numerical baselines.

## Validation and errors

Use unit-bearing strings or Quantities for lengths. Optional defaults apply only to omitted values or `undefined`; replace `null` with `undefined` when requesting a default. Wrong types or dimensions throw `PipeTypeError`, invalid numeric ranges or geometry throw `PipeRangeError`, and unsupported selections throw `PipeError`. Use `isPipeError(error)` and its `code` and `field` instead of matching message text; all three classes carry structured details.

Component port errors consistently identify `ports.<name>` for an invalid port object and `ports.<name>.<field>` for a field within it. Reducer outlet and equal-diameter errors now use `ports.outlet` instead of `outlet`. Malformed port objects no longer introduce a synthetic `.definition` suffix. Update handlers that match those previous paths; error classes, codes and rejected values are unchanged.

`Port` snapshots its option fields and nominal designation before retaining them: getters are evaluated once for each field. Custom component port maps use own, enumerable, non-empty string names. Symbol keys are rejected in TypeScript and at runtime, including non-enumerable own symbols. JavaScript numeric property names are accepted as their string representation (for example, `1` becomes `'1'`). Symbols remain supported inside metadata and custom definition data.

## Read-only definitions and custom components

Create a new definition to change geometry instead of assigning to its properties. Library readonly fields and catalogue tables are now protected at runtime. `raw()`, `find()` result arrays and `available*()` arrays remain detached and editable.

A component copies and freezes its port map, but adopts and recursively freezes port definitions in place. `PipeComponent` adopts its pipe definition in the same way. Finish building custom data before attachment and keep mutable network state (flow, pressure, valve opening) outside these reusable physical definitions. Custom subclasses should validate their additional options before calling `super()`; built-in validation failures leave supplied definitions unfrozen.

Metadata is copied and recursively frozen. Use `ComponentMetadata` and `ComponentMetadataValue` for plain records, arrays, primitives and Quantities; convert dates, maps, sets, functions and other unsupported values to plain data. Metadata accessors are rejected. See [creating custom components](../README.md#creating-custom-components) and [public validation helpers](../README.md#public-validation-helpers) when extending the library.

## Structural geometry contracts

Custom `PipeDefinition` implementations must now supply all six geometry fields: `internalDiameter`, `outerDiameter`, `wallThickness`, `internalCrossSectionalArea`, `externalCrossSectionalArea`, and `materialCrossSectionalArea`, each as a Quantity. Previously partial definitions must add the missing wall and outer geometry; `outerDiameter` is now required. `RawPipe` derives the same required fields from `PipeDefinition`, using mutable numbers for detached snapshots. Custom `PortDefinition` implementations must supply `internalDiameter`. Update old structural object keys; these interfaces require the canonical names so consumers can access them reliably. Positional constructor calls keep the same argument order. Error handlers that inspect `field` must use the canonical names (`outerDiameter`, `wallThickness`, `internalDiameter`, `pressureRating`, and PE `size`).

## Error compatibility

Wrong-type angles now produce `PipeTypeError`, non-finite schedules produce `PipeRangeError`, and unsupported sizing modes/styles produce `PipeError`. Null optional values no longer select defaults. Bare numeric lengths use `INVALID_INPUT`; dimensioned values with incompatible units continue to use `INVALID_DIMENSION`. Nominal-size errors identify `nominalSize.system` or `nominalSize.value`, and nested port errors include the port path.
