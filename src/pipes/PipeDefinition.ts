import type { Quantity } from '@neutrium/quantity';

/**
 * Structural geometry contract for a uniform circular pipe cross-section.
 * Implementations must supply finite, positive, mutually consistent dimensions and areas.
 * Length, roughness, placement and operating state belong to the application.
 */
export interface PipeDefinition
{
	/** Actual internal diameter, with length units. */
	readonly internalDiameter: Quantity;
	/** External diameter, with length units; greater than the internal diameter. */
	readonly outerDiameter: Quantity;
	/** Wall thickness, equal to half the difference between outer and internal diameters. */
	readonly wallThickness: Quantity;
	/** Internal flow area, consistent with pi * internalDiameter^2 / 4, with area units. */
	readonly internalCrossSectionalArea: Quantity;
	/** Enclosed outer area, consistent with pi * outerDiameter^2 / 4, with area units. */
	readonly externalCrossSectionalArea: Quantity;
	/** Pipe wall area, equal to external minus internal cross-sectional area. */
	readonly materialCrossSectionalArea: Quantity;
}
