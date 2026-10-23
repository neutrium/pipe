// Keep the public API explicit; supporting contracts have one feature owner.
export { Pipe, PipeComponent, ASME_B36_10_Pipe, ASTM_B88_Tube, ASTM_B88M_Tube, ISO_11922_Pipe, BWG_Tube } from './pipes/index.js';
export type {
	RawPipe, PipeDefinition, PipeComponentOptions, PipeSearchOptions, ASMEPipeSearchOptions, NominalSizingSystem,
	ASTMB88SearchOptions, ASTMB88Type, ASTMB88MSearchOptions, ASTMB88MType,
	ISOPipeSearchOptions, PECompound, PressureRating, BWGSearchOptions, BWGGauge,
} from './pipes/index.js';
export { Port } from './connections/index.js';
export type { PortOptions, PortDetails, PortDefinition, NominalSize } from './connections/index.js';
export { Component, TwoPortComponent } from './components/index.js';
export type {
	ComponentDefinition, ComponentOptions, ComponentMetadata, ComponentMetadataValue, PortMap,
	TwoPortComponentOptions, TwoPortMap, DeepReadonly,
} from './components/index.js';
export { Elbow, Tee, Reducer } from './fittings/index.js';
export type { ElbowOptions, TeeOptions, TeePortMap, ReducerOptions } from './fittings/index.js';
export { Valve } from './valves/index.js';
export type { ValveOptions } from './valves/index.js';
export { positiveLength, nonNegativeLength, finiteNumber, lengthQuantity, densityQuantity } from './validation.js';
export { PipeError, PipeTypeError, PipeRangeError, isPipeError } from './errors.js';
export type { PipeErrorCode, PipeErrorDetails } from './errors.js';
