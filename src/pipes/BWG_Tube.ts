//
//	Birmingham Wire Gauge/Stubs Wire Gauge Tube
//

import { lockProperties, freezeDefinition } from '../internal/readonly.js';
import { validateObject } from '../internal/validation.js';
import { Pipe } from './Pipe.js'
import { Quantity } from '@neutrium/quantity';
import { findPipes, queryLength, validateIdentifier } from './catalogue.js';
import type { PipeSearchOptions } from './catalogue.js';
import { lengthQuantity } from '../validation.js';
import { tableKeys } from '../internal/tableKeys.js';
import { PipeError } from '../errors.js';

export type BWGGauge = keyof typeof BWG_Tube.BWG_DATA;

export interface BWGSearchOptions extends PipeSearchOptions
{
	/** BWG specifies wall thickness only, so an outer diameter is required. */
	outerDiameter: string | Quantity;
	gauge?: BWGGauge;
}


export class BWG_Tube extends Pipe
{
	// BWG wall thickness data (inches)
	static readonly BWG_DATA = Object.freeze({"00000": 0.5, "5/0": 0.5,"0000": 0.454, "4/0": 0.454,"000": 0.425, "3/0": 0.425,"00": 0.38, "2/0": 0.38,"0": 0.34,"1": 0.3,"2": 0.284,"3": 0.259,"4": 0.238,"5": 0.22,"6": 0.203,"7": 0.18,"8": 0.165,"9": 0.148,"10": 0.134,"11": 0.12,"12": 0.109,"13": 0.095,"14": 0.083,"15": 0.072,"16": 0.065,"17": 0.058,"18": 0.049,"19": 0.042,"20": 0.035,"21": 0.032,"22": 0.028,"23": 0.025,"24": 0.022,"25": 0.02,"26": 0.018,"27": 0.016,"28": 0.014,"29": 0.013,"30": 0.012,"31": 0.01,"32": 0.009,"33": 0.008,"34": 0.007,"35": 0.005,"36": 0.004});

	public readonly gauge: BWGGauge;

	/** Gauges, thickest wall first; optionally omit gauges that leave no bore. Aliases are retained. */
	public static availableGauges(outerDiameter?: string | Quantity): BWGGauge[]
	{
		const od = outerDiameter === undefined ? undefined : queryLength(outerDiameter, "Outer diameter");

		return tableKeys(BWG_Tube.BWG_DATA)
			.filter(gauge => od === undefined || new Quantity(BWG_Tube.BWG_DATA[gauge], "in").mul(2).lt(od))
			.sort((a, b) => BWG_Tube.BWG_DATA[b] - BWG_Tube.BWG_DATA[a]);
	}

	/** Matching gauges at the supplied outer diameter, ordered by internal diameter. */
	public static find(options: BWGSearchOptions): BWG_Tube[]
	{
		validateObject(options);

		if(options.gauge !== undefined)
		{
			validateIdentifier(options.gauge, "gauge", "INVALID_GAUGE");
		}

		const od = queryLength(options.outerDiameter, "Outer diameter");

		return findPipes(options, matches => BWG_Tube.availableGauges(od)
			.filter(gauge => options.gauge === undefined || gauge === options.gauge)
			.filter(gauge => matches(od, BWG_Tube.BWG_DATA[gauge], "in"))
			.map(gauge => new BWG_Tube(od, gauge)));
	}

	constructor(outerDiameter: string | Quantity, gauge: BWGGauge)
	{
		validateIdentifier(gauge, "gauge", "INVALID_GAUGE");
		const diameter = lengthQuantity(outerDiameter, "outerDiameter", "Outer diameter");

		if(!Object.hasOwn(BWG_Tube.BWG_DATA, gauge))
		{
			throw new PipeError("Invalid birmingham wire gauge provided", {
				code: "INVALID_GAUGE", field: "gauge", value: gauge,
				allowedValues: BWG_Tube.availableGauges(diameter),
			});
		}

		const wt = new Quantity(BWG_Tube.BWG_DATA[gauge], "in").to(diameter.units());
		super(diameter, wt);
		this.gauge = gauge;
		lockProperties(this, ["gauge"]);
	}

	static {
		freezeDefinition(this.BWG_DATA);
		lockProperties(this, ["BWG_DATA"]);
	}
}
