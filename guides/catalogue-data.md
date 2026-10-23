# Dimensional catalogue audit — 22 October 2026

This audit records the editions of the references actually checked; it does not claim the original data came from those editions or certify compliance with all requirements of a standard. Physical dimensions, rather than pressure ratings, material properties, or manufacturing tolerances, are the audit scope.

| Catalogue | Reference and dimensional basis | Checked coverage |
|:----------|:--------------------------------|:-----------------|
| ASME steel | [Atlas Steels Pipe Dimensions, revision 8 April 2021](https://atlassteels.com.au/wp-content/uploads/2021/08/Pipe-Dimensions-08-04-21.pdf), p1; explicitly based on ASME B36.10M-2004 and B36.19M-2004 | Selected populated wall columns across DN6–750, recorded individually in the reference fixture. Inch-derived values compared at the source's 0.01mm precision. |
| ASTM B88 copper | [ASHRAE Handbook—Fundamentals 2025, Chapter 22, Table 17](https://handbook.ashrae.org/Handbooks/F25/IP/F25_Ch22/F25_Ch22_ip.aspx); B88 dimensional reference, B88 edition unspecified by that table | All 18 stored nominal sizes, ODs and supported K/L/M walls. |
| ASTM B88M copper | [ASTM B88M-16, Table 1 public preview](https://cdn.standards.iteh.ai/samples/95908/1d879c66c76c45d794c4abe3afe7c8c1/ASTM-B88M-16.pdf) | All 19 stored ODs and A/B/C walls. Footnotes on availability/tolerances are not modelled. This is not a claim of verification against B88M-20. |
| PE Series 1 | [Vinidex capability matrix](https://www.vinidex.com.au/app/uploads/pdf/Vinidex-PE-Pipe-Capability-Matrix.pdf), p1, edition not printed; [Vinidex EPD v2.0, 16 September 2022](https://www.vinidex.com.au/app/uploads/pdf/EPD-for-Polyethylene-Pipes.pdf), pp28–29 explicitly identifies AS/NZS 4130:2009; [APS 2020 Revision 1](https://www.auspolyspec.com.au/Resources/APS-PE-20Rev1.pdf), printed pp16–17 corroborates larger sizes | SDR41 through DN2000 and tabulated SDR7.4 through DN450 have independent regression fixtures. Other SDR rows receive whole-table consistency checks; full cell-by-cell standards verification remains outstanding. |
| BWG | [Thomas C. Wilson inch reference](https://www.tcwilson.com/resources/technical-references/birmingham-wire-gauges-inches/) and [Vogel Tool BWG chart](https://www.vogeltool.com/tool-die-charts/), publication editions unspecified | All 41 distinct gauges, from 5/0 to 36, plus alias consistency. |

The PE class retains its historical name ISO_11922_Pipe`, but its wall table is based on AS/NZS 4130:2009 Series 1. ISO 11922 by itself is not the source of these pressure-series wall thicknesses. The library uses minimum OD and minimum wall thickness; its calculated bore is not the manufacturer's mean bore.

Corrections and compatibility changes:

- **Steel:** aligned 21 wall entries with the Atlas reference, retaining the existing inch-derived representation. This includes DN200 schedule 30 (6.35 → 7.0358mm) and DN300 schedule 60 (12.7 → 14.2748mm); the other 19 corrections are 0.001in increments. Calculated bores and areas change accordingly.
- **PE SDR41:** split the merged `9.811` entry into 9.8mm at DN400 and 11mm at DN450. This restores alignment through DN2000, including its 48.8mm wall.
- **PE SDR7.4:** replaced the copied SDR9 values with the referenced walls through DN450. Removed the incorrect DN500–800 entries. The Vinidex table marks its DN500–710 extensions as calculated, and APS gives differing values for some extensions. They are deliberately excluded from this historical table; use an explicit `Pipe` with manufacturer dimensions when modelling those products.
- **Copper/BWG:** no dimensional corrections were needed in the checked entries. Corrected the B88M wall-table unit comment from inches to millimetres.

One steel reference difference is retained explicitly: DN40 XXS uses 0.400in (10.16mm), corroborated by [Penn Stainless](https://www.pennstainless.com/resources/product-resources/pipe-dimensions/), while Atlas prints 10.15mm. Steel references can also differ in their rounding conventions; the fixture states its comparison tolerance. Existing steel entries outside the recorded reference cases, including DN115, DN800–1050 and legacy `160S` labels, are not independently verified by this audit. A `160S` label must not be interpreted as proof of a B36.19 standard designation. No new combinations
were inferred from blank source cells.

`spec/fixtures/catalogue-reference.js` contains independently recorded dimensional observations with source URLs. `spec/catalogue-audit.spec.js` checks those values, parallel-table lengths, size uniqueness, valid bores, PE thickness ordering and coarse SDR plausibility, copper grade ordering, and BWG aliases. These consistency checks detect transcription errors; they do not replace checking a specific standard edition or manufacturer's certified dimensions.
