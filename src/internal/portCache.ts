import type { PortDefinition } from '../connections/Port.js';

// Weak keys do not keep definitions alive after their users release them.
export const verifiedPorts = new WeakMap<PortDefinition, PortDefinition>();
