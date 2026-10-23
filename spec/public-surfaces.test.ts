// Consumer declarations: features own their contracts; shared types use their canonical entry point.
import { Quantity } from '@neutrium/quantity';
import * as root from '@neutrium/pipe';
import * as pipes from '@neutrium/pipe/pipes';
import * as connections from '@neutrium/pipe/connections';
import * as components from '@neutrium/pipe/components';
import * as fittings from '@neutrium/pipe/fittings';
import * as valves from '@neutrium/pipe/valves';
import * as errors from '@neutrium/pipe/errors';

const pipe: pipes.PipeDefinition = new pipes.Pipe('25mm', '2mm');
const portPipe: pipes.PipeDefinition = pipe;
const nominalSize: connections.NominalSize = { system: 'DN', value: 20 };
const portDetails: connections.PortDetails = { nominalSize, connection: 'flanged' };
const portOptions: connections.PortOptions = { ...portDetails, internalDiameter: pipe.internalDiameter };
const port: connections.PortDefinition = new connections.Port(portOptions);

const componentPipe: pipes.PipeDefinition = portPipe;
const componentPort: connections.PortDefinition = port;
const componentNominal: connections.NominalSize = nominalSize;
const componentDetails: connections.PortDetails = portDetails;
const componentMetadata: components.ComponentMetadata = { model: 'Example' };
const componentOptions: components.ComponentOptions = { kind: 'custom', ports: { supply: componentPort }, metadata: componentMetadata };
const twoPortOptions: components.TwoPortComponentOptions = { kind: 'custom', inlet: componentPort };
const adapterOptions: pipes.PipeComponentOptions = { ...componentDetails, metadata: componentMetadata };
const componentMap: components.PortMap = new components.Component(componentOptions).ports;
const twoPortMap: components.TwoPortMap = new components.TwoPortComponent(twoPortOptions).ports;
const component: components.ComponentDefinition = new pipes.PipeComponent(componentPipe, adapterOptions);
const readonlyPipe: components.DeepReadonly<typeof componentPipe> = new pipes.PipeComponent(componentPipe).pipe;

const fittingPort: connections.PortDefinition = port;
const fittingNominal: connections.NominalSize = nominalSize;
const fittingMetadata: components.ComponentMetadata = componentMetadata;
const elbowOptions: fittings.ElbowOptions = { port: fittingPort, metadata: fittingMetadata };
const teeOptions: fittings.TeeOptions = { run: fittingPort };
const reducerOptions: fittings.ReducerOptions = { inlet: fittingPort, outlet: { internalDiameter: new Quantity('10mm') } };
const fittingMap: components.DeepReadonly<components.TwoPortMap> = new fittings.Elbow(elbowOptions).ports;
const teeMap: fittings.TeePortMap = new fittings.Tee(teeOptions).ports;
const fitting: components.ComponentDefinition = new fittings.Reducer(reducerOptions);

const valvePort: connections.PortDefinition = port;
const valveNominal: connections.NominalSize = nominalSize;
const valveMetadata: components.ComponentMetadata = componentMetadata;
const valveOptions: valves.ValveOptions = { valveType: 'ball', inlet: valvePort, metadata: valveMetadata };
const valveMap: components.DeepReadonly<components.TwoPortMap> = new valves.Valve(valveOptions).ports;
const valve: components.ComponentDefinition = new valves.Valve(valveOptions);

const errorCode: errors.PipeErrorCode = 'INVALID_PORT';
const errorDetails: errors.PipeErrorDetails = { code: errorCode, field: 'port', value: null };
const error: root.PipeError = new errors.PipeError('Invalid port', errorDetails);
const rootOptions: root.ValveOptions = valveOptions;
const rootDefinition: root.ComponentDefinition = valve;
const rootMap: root.TeePortMap = teeMap;

// Implementation helpers and source layout are not part of the public API.
// @ts-expect-error tableKeys is an internal catalogue helper.
import { tableKeys } from '@neutrium/pipe/validation';
// @ts-expect-error Deep implementation imports are not exported by the package.
import { freezeDefinition } from '@neutrium/pipe/dist/internal/readonly.js';

// Cross-feature convenience exports have been removed; use the owner or root.
// @ts-expect-error TwoPortMap belongs to components.
import type { TwoPortMap as ValvePortMap } from '@neutrium/pipe/valves';
// @ts-expect-error Shared metadata belongs to components.
import type { ComponentMetadata as FittingMetadata } from '@neutrium/pipe/fittings';
// @ts-expect-error PortDefinition belongs to connections.
import type { PortDefinition as ComponentPort } from '@neutrium/pipe/components';
// @ts-expect-error PipeDefinition belongs to pipes.
import type { PipeDefinition as ConnectionPipe } from '@neutrium/pipe/connections';
// @ts-expect-error NominalSize belongs to connections.
import type { NominalSize as PipeNominalSize } from '@neutrium/pipe/pipes';
const rootPortMap: root.TwoPortMap = twoPortMap;
const rootMetadata: root.ComponentMetadata = componentMetadata;
const rootNominalSize: root.NominalSize = nominalSize;
const rootPipe: root.PipeDefinition = pipe;
const rootPort: root.PortDefinition = port;
