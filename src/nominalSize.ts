/** A designation, not a physical dimension or a conversion between DN and NPS. */
export interface NominalSize
{
	/** DN and ASTM_B88M use millimeter designations; NPS and ASTM_B88 use inch designations. */
	readonly system: "DN" | "NPS" | "ASTM_B88" | "ASTM_B88M";
	readonly value: number;
}

