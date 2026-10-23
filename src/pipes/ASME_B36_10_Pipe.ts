//
//	ASME/ANSI B36.10/19 Steel and Stainless Steel Pipe
//

import { lockProperties, freezeDefinition } from '../internal/readonly.js';
import { validateObject, validateNumber, validateString } from '../internal/validation.js';
import type { NominalSize } from '../nominalSize.js';
import { Pipe } from './Pipe.js'
import { Quantity } from '@neutrium/quantity';
import { findPipes, usableDimensions, resolveSize, validateIdentifier } from './catalogue.js';
import type { PipeSearchOptions } from './catalogue.js';
import { lengthQuantity } from '../validation.js';
import { PipeError } from '../errors.js';

export type NominalSizingSystem = "DN" | "NPS";

export interface ASMEPipeSearchOptions extends PipeSearchOptions
{
	schedule?: string | number;
	/** Defaults to DN; controls the units of the returned pipes. */
	sizingSystem?: NominalSizingSystem;
}

export class ASME_B36_10_Pipe extends Pipe
{
	readonly nominalSize: NominalSize;
	// Schedule pipe outer diameter [<DN size>, <NPS size>, <OD in m>]
	static readonly OD_DATA: readonly (readonly [number, number, number])[] = [[6, 1/8, 0.0103],[8, 1/4, 0.0137],[10, 3/8, 0.0171],[15, 1/2, 0.0213],[20, 3/4, 0.0267],[25, 1, 0.0334],[32, 1.25, 0.0422],[40, 1.5, 0.0483],[50, 2, 0.0603],[65, 2.5, 0.073],[80, 3, 0.0889],[90, 3.5, 0.1016],[100, 4, 0.1143],[115, 4.5, 0.127],[125, 5, 0.1413],[150, 6, 0.1683],[200, 8, 0.2191],[250, 10, 0.2731],[300, 12, 0.3239],[350, 14, 0.3556],[400, 16, 0.4064],[450, 18, 0.4572],[500, 20, 0.508],[550, 22, 0.5588],[600, 24, 0.6096],[650, 26, 0.6604],[700, 28, 0.7112],[750, 30, 0.762],[800, 32, 0.8128],[850, 34, 0.8636],[900, 36, 0.9144],[1050, 42, 1.0668]];

	// Schedule pipe wall thickness data (in m) referenced by DN size
	// Audited against Atlas Steels 2021 (B36.10M/B36.19M-2004 basis).
	// Inch-derived precision is retained. Coverage and exceptions: README catalogue audit.
	static readonly WT_DATA: Readonly<Record<string, Readonly<Record<string, number>>>> = {
		"6" : {"5": 0.000889, "10": 0.001245, "30": 0.001448, "40": 0.001727, "80": 0.002413, "STD": 0.001727, "XS": 0.002413, "10S": 0.001245, "40S": 0.001727, "80S": 0.002413},
		"8" : {"5": 0.001245, "10": 0.001651, "30":	0.001854, "40":	0.002235, "80": 0.003023, "STD": 0.002235, "XS": 0.003023, "10S": 0.001651, "40S": 0.002235, "80S": 0.003023},
		"10": {"5": 0.001245, "10": 0.001651, "30": 0.001854, "40": 0.002311, "80":	0.003200, "STD": 0.002311, "XS": 0.003200, "10S": 0.001651, "40S": 0.002311, "80S": 0.003200},
		"15": {"5": 0.001651, "10": 0.002108, "30": 0.002413, "40": 0.002769, "80": 0.003734, "120": 0.004318, "160": 0.004775, "STD": 0.002769, "XS": 0.003734, "XXS": 0.007468, "5S": 0.001651, "10S": 0.002108, "40S": 0.002769, "80S": 0.003734, "160S": 0.004780},
		"20": {"5": 0.001651, "10": 0.0021082, "30": 0.002413, "40": 0.0028702, "80": 0.0039116, "160": 0.0055626, "STD": 0.0028702, "XS": 0.0039116, "XXS": 0.0078232, "5S": 0.001651, "10S": 0.0021082, "40S": 0.0028702, "80S": 0.0039116, "160S": 0.00557},
		"25": {"5": 0.001651, "10": 0.0027686, "30": 0.0028956, "40": 0.0033782, "80": 0.0045466, "160": 0.00635, "STD": 0.0033782, "XS": 0.0045466, "XXS": 0.0090932, "5S": 0.001651, "10S": 0.0027686, "40S": 0.0033782, "80S": 0.0045466, "160S": 0.00635},
		"32": {"5": 0.001651, "10": 0.0027686, "30": 0.0029718, "40": 0.003556, "80": 0.0048514, "160": 0.00635, "STD": 0.003556, "XS": 0.0048514, "XXS": 0.0097028, "5S": 0.001651, "10S": 0.0027686, "40S": 0.003556, "80S": 0.0048514, "160S": 0.00635},
		"40": {"5": 0.001651, "10": 0.0027686, "30": 0.003175, "40": 0.003683, "80": 0.00508, "160": 0.0071374, "STD": 0.003683, "XS": 0.00508, "XXS": 0.01016, "5S": 0.001651, "10S": 0.0027686, "40S": 0.003683, "80S": 0.00508, "160S": 0.00714},
		"50": {"5": 0.001651, "10": 0.0027686, "30": 0.003175, "40": 0.0039116, "80": 0.0055372, "120": 0.00635, "160": 0.0087376, "STD": 0.0039116, "XS": 0.0055372, "XXS": 0.0110744, "5S": 0.001651, "10S": 0.0027686, "40S": 0.0039116, "80S": 0.0055372, "160S": 0.00874},
		"65": {"5": 0.0021082, "10": 0.003048, "30": 0.0047752, "40": 0.0051562, "80": 0.0070104, "120": 0.00762, "160": 0.009525, "STD": 0.0051562, "XS": 0.0070104, "XXS": 0.0140208, "5S": 0.0021082, "10S": 0.003048, "40S": 0.0051562, "80S": 0.0070104, "160S": 0.00953},
		"80": {"5": 0.0021082, "10": 0.003048, "30": 0.0047752, "40": 0.0054864, "80": 0.00762, "120": 0.00889, "160": 0.0111252, "STD": 0.0054864, "XS": 0.00762, "XXS": 0.01524, "5S": 0.0021082, "10S": 0.003048, "40S": 0.0054864, "80S": 0.00762, "160S": 0.01113},
		"90": {"5": 0.0021082, "10": 0.003048, "30": 0.0047752, "40": 0.0057404, "80": 0.0080772, "STD": 0.0057404, "XS": 0.0080772, "XXS": 0.0161544, "5S": 0.0021082, "10S": 0.003048, "40S": 0.0057404, "80S": 0.0080772},
		"100": {"5": 0.0021082, "10": 0.003048, "30": 0.0047752, "40": 0.0060198, "60": 0.0071374, "80": 0.0085598, "120": 0.0111252, "160": 0.0134874, "STD": 0.0060198, "XS": 0.0085598, "XXS": 0.0171196, "5S": 0.0021082, "10S": 0.003048, "40S": 0.0060198, "80S": 0.0085598, "160S": 0.01349},
		"115": {"40": 0.0062738, "80": 0.009017},
		"125": {"5": 0.0027686, "10": 0.0034036, "40": 0.0065532, "80": 0.009525, "120": 0.0127, "160": 0.015875, "STD": 0.0065532, "XS": 0.009525, "XXS": 0.01905, "5S": 0.0027686, "10S": 0.0034036, "40S": 0.0065532, "80S": 0.009525, "160S": 0.01588},
		"150": {"5": 0.0027686, "10": 0.0034036, "40": 0.007112, "80": 0.0109728, "120": 0.0142748, "160": 0.0182626, "STD": 0.007112, "XS": 0.0109728, "XXS": 0.0219456, "5S": 0.0027686, "10S": 0.0034036, "40S": 0.007112, "80S": 0.0109728, "160S": 0.01827},
		"200": {"5": 0.0027686, "10": 0.0037592, "20": 0.00635, "30": 0.0070358, "40": 0.0081788, "60": 0.0103124, "80": 0.0127, "100": 0.0150876, "120": 0.0182626, "140": 0.0206248, "160": 0.0230124, "STD": 0.0081788, "XS": 0.0127, "XXS": 0.022225, "5S": 0.0027686, "10S": 0.0037592, "40S": 0.0081788, "80S": 0.0127, "160S": 0.02302},
		"250": {"5": 0.0034036, "10": 0.004191, "20": 0.00635, "30": 0.0077978, "40": 0.009271, "60": 0.0127, "80": 0.0150876, "100": 0.0182626, "120": 0.0214376, "140": 0.0254, "160": 0.028575, "STD": 0.009271, "XS": 0.0127, "XXS": 0.0254, "5S": 0.0034036, "10S": 0.004191, "40S": 0.009271, "80S": 0.0127, "160S": 0.02858},
		"300": {"5": 0.0039624, "10": 0.004572, "20": 0.00635, "30": 0.008382, "40": 0.0103124, "60": 0.0142748, "80": 0.0174752, "100": 0.0214376, "120": 0.0254, "140": 0.028575, "160": 0.0333248, "STD": 0.009525, "XS": 0.0127, "XXS": 0.0254, "5S": 0.0039624, "10S": 0.004572, "40S": 0.009525, "80S": 0.0127, "160S": 0.03333},
		"350": {"5": 0.0039624, "10": 0.00635, "20": 0.0079248, "30": 0.009525, "40": 0.0111252, "60": 0.0150876, "80": 0.01905, "100": 0.0238252, "120": 0.0277876, "140": 0.03175, "160": 0.0357124, "STD": 0.009525, "XS": 0.0127, "5S": 0.0039624, "10S": 0.0047752, "40S": 0.009525, "80S": 0.0127},
		"400": {"5": 0.004191, "10": 0.00635, "20": 0.0079248, "30": 0.009525, "40": 0.0127, "60": 0.0166624, "80": 0.0214376, "100": 0.0261874, "120": 0.0309626, "140": 0.0365252, "160": 0.0404876, "STD": 0.009525, "XS": 0.0127, "5S": 0.004191, "10S": 0.0047752, "40S": 0.009525, "80S": 0.0127},
		"450": {"5": 0.004191, "10": 0.00635, "20": 0.0079248, "30": 0.0111252, "40": 0.0142748, "60": 0.01905, "80": 0.0238252, "100": 0.0293624, "120": 0.034925, "140": 0.0396748, "160": 0.0452374, "STD": 0.009525, "XS": 0.0127, "5S": 0.004191, "10S": 0.0047752, "40S": 0.009525, "80S": 0.0127},
		"500": {"5": 0.0047752, "10": 0.00635, "20": 0.009525, "30": 0.0127, "40": 0.0150876, "60": 0.0206248, "80": 0.0261874, "100": 0.0325374, "120": 0.0381, "140": 0.04445, "160": 0.0500126, "STD": 0.009525, "XS": 0.0127, "5S": 0.0047752, "10S": 0.0055372, "40S": 0.009525, "80S": 0.0127},
		"550": {"10": 0.00635, "20": 0.009525, "30": 0.0127, "60": 0.022225, "80": 0.028575, "100": 0.034925, "120": 0.041275, "140": 0.047625, "160": 0.053975, "STD": 0.009525, "XS": 0.0127, "5S": 0.0047752, "10S": 0.0055372},
		"600": {"5": 0.0055372, "10": 0.00635, "20": 0.009525, "30": 0.0142748, "40": 0.0174752, "60": 0.0246126, "80": 0.0309626, "100": 0.0388874, "120": 0.0460248, "140": 0.0523748, "160": 0.0595376, "STD": 0.009525, "XS": 0.0127, "5S": 0.0055372, "10S": 0.00635, "40S": 0.009525, "80S": 0.0127},
		"650": {"10": 0.0079248, "20": 0.0127, "STD": 0.009525, "XS": 0.0127},
		"700": {"10": 0.0079248, "20": 0.0127, "30": 0.015875, "STD": 0.009525, "XS": 0.0127},
		"750": {"10": 0.0079248, "20": 0.0127, "30": 0.015875, "STD": 0.009525, "XS": 0.0127, "40S": 0.009525, "80S": 0.0127},
		"800": {"10": 0.0079248, "20": 0.0127, "30": 0.015875, "40": 0.0174752, "STD": 0.009525, "XS": 0.0127},
		"850": {"10": 0.0087376, "20": 0.0127, "30": 0.015875, "40": 0.0174752, "STD": 0.009525, "XS": 0.0127},
		"900": {"10": 0.0079248, "20": 0.0127, "30": 0.015875, "40": 0.01905, "STD": 0.009525, "XS": 0.0127, "40S": 0.009525, "80S": 0.0127},
		"1050": {}
	}

	public readonly schedule: string;
	public readonly dn: number;
	public readonly nps: number;

	/** Available nominal designations, in ascending order. Defaults to DN. */
	public static availableSizes(sizingSystem: NominalSizingSystem = "DN", schedule?: string | number): number[]
	{
		const column = ASME_B36_10_Pipe.sizeColumn(sizingSystem);
		const selected = schedule === undefined ? undefined : ASME_B36_10_Pipe.normalizeSchedule(schedule);

		return ASME_B36_10_Pipe.OD_DATA
			.filter(row => {
				const schedules = ASME_B36_10_Pipe.availableSchedules(row[column], sizingSystem);
				return selected === undefined ? schedules.length > 0 : schedules.includes(selected);
			})
			.map(row => row[column]);
	}

	/** Schedules for an exact nominal designation; an unsupported size returns []. */
	public static availableSchedules(size: number, sizingSystem: NominalSizingSystem = "DN"): string[]
	{
		const column = ASME_B36_10_Pipe.sizeColumn(sizingSystem);
		const index = resolveSize(size, ASME_B36_10_Pipe.OD_DATA.map(row => row[column]));
		const row = ASME_B36_10_Pipe.OD_DATA[index];

		if(!row)
		{
			return [];
		}

		const walls = ASME_B36_10_Pipe.WT_DATA[row[0]] || {};

		return Object.keys(walls).filter(schedule => usableDimensions(row[2], walls[schedule]));
	}

	/** Matching pipes, ordered by internal diameter, smallest first. */
	public static find(options: ASMEPipeSearchOptions = {}): ASME_B36_10_Pipe[]
	{
		validateObject(options);
		const system = options.sizingSystem === undefined ? "DN" : options.sizingSystem;
		const selected = options.schedule === undefined ? undefined : ASME_B36_10_Pipe.normalizeSchedule(options.schedule);

		return findPipes(options, matches => {
			const column = ASME_B36_10_Pipe.sizeColumn(system);
			const pipes: ASME_B36_10_Pipe[] = [];

			for(const row of ASME_B36_10_Pipe.OD_DATA)
			{
				for(const [schedule, thickness] of Object.entries(ASME_B36_10_Pipe.WT_DATA[row[0]] ?? {}))
				{
					if((selected === undefined || schedule === selected) &&
						usableDimensions(row[2], thickness) &&
						matches(row[2], thickness, "m", system === "DN" ? "mm" : "in")
					){
						pipes.push(new ASME_B36_10_Pipe(new Quantity(row[column], system === "DN" ? "mm" : "in"), schedule));
					}
				}
			}

			return pipes;
		});
	}

	/** Normalize numeric schedules once at each public input boundary. */
	private static normalizeSchedule(schedule: string | number): string
	{
		if(typeof schedule === "number")
		{
			validateNumber(schedule, "schedule", "INVALID_SCHEDULE");
			return String(schedule);
		}

		validateIdentifier(schedule, "schedule", "INVALID_SCHEDULE");

		return schedule;
	}

	private static sizeColumn(system: NominalSizingSystem): 0 | 1
	{
		validateString(system, "sizingSystem", "INVALID_SIZING_SYSTEM");

		if(system !== "DN" && system !== "NPS")
		{
			throw new PipeError("Sizing system must be DN or NPS", {
				code: "INVALID_SIZING_SYSTEM", field: "sizingSystem", value: system, allowedValues: ["DN", "NPS"],
			});
		}

		return system === "DN" ? 0 : 1;
	}

	/**
	 * Create a pipe from a DN nominal designation, with dimensions in millimetres.
	 * @example ASME_B36_10_Pipe.fromDN(100, "40")
	 */
	public static fromDN(dn: number, schedule: string | number): ASME_B36_10_Pipe
	{
		const index = resolveSize(dn, ASME_B36_10_Pipe.OD_DATA.map(row => row[0]), "dn");

		if(index < 0)
		{
			throw new PipeError("Invalid pipe size provided", {
				code: "INVALID_SIZE", field: "dn", value: dn, allowedValues: ASME_B36_10_Pipe.availableSizes("DN"),
			});
		}

		return new ASME_B36_10_Pipe(new Quantity(ASME_B36_10_Pipe.OD_DATA[index]![0], "mm"), schedule);
	}

	/**
	 * Create a pipe from an NPS nominal designation, with dimensions in inches.
	 * Fractional sizes use numbers, e.g. 1 / 8 for NPS 1/8.
	 * @example ASME_B36_10_Pipe.fromNPS(4, "40")
	 */
	public static fromNPS(nps: number, schedule: string | number): ASME_B36_10_Pipe
	{
		const index = resolveSize(nps, ASME_B36_10_Pipe.OD_DATA.map(row => row[1]), "nps");

		if(index < 0)
		{
			throw new PipeError("Invalid pipe size provided", {
				code: "INVALID_SIZE", field: "nps", value: nps, allowedValues: ASME_B36_10_Pipe.availableSizes("NPS"),
			});
		}

		return new ASME_B36_10_Pipe(new Quantity(ASME_B36_10_Pipe.OD_DATA[index]![1], "in"), schedule);
	}

	/** Create a pipe using inches for NPS or other length units for DN selection. */
	constructor(size: string | Quantity, schedule: string | number)
	{
		const selected = ASME_B36_10_Pipe.normalizeSchedule(schedule);
		const sizeQty = lengthQuantity(size, "size", "Nominal size");
		const units = sizeQty.units();
		const system = units === "in" ? "NPS" : "DN";
		const column = ASME_B36_10_Pipe.sizeColumn(system);
		const nominal = system === "NPS" ? sizeQty.scalar.toNumber() : sizeQty.to("mm").scalar.toNumber();
		const index = resolveSize(nominal, ASME_B36_10_Pipe.OD_DATA.map(row => row[column]));
		const row = ASME_B36_10_Pipe.OD_DATA[index];

		if(!row)
		{
			throw new PipeError("Invalid pipe size provided", {
				code: "INVALID_SIZE", field: "size", value: size,
				allowedValues: ASME_B36_10_Pipe.availableSizes(system),
			});
		}

		const walls = ASME_B36_10_Pipe.WT_DATA[row[0]];
		const thickness = walls && Object.hasOwn(walls, selected) ? walls[selected] : undefined;

		if(thickness === undefined)
		{
			throw new PipeError("Invalid combination of pipe size and schedule provided", {
				code: "INVALID_SCHEDULE", field: "schedule", value: schedule,
				allowedValues: ASME_B36_10_Pipe.availableSchedules(nominal, system),
			});
		}

		super(new Quantity(row[2], "m").to(units), new Quantity(thickness, "m").to(units));
		this.schedule = selected;
		this.dn = row[0];
		this.nps = row[1];
		this.nominalSize = Object.freeze({ system: "DN", value: row[0] });
		lockProperties(this, ["schedule", "dn", "nps", "nominalSize"]);
	}

	static {
		freezeDefinition(this.OD_DATA);
		freezeDefinition(this.WT_DATA);
		lockProperties(this, ["OD_DATA", "WT_DATA"]);
	}
}
