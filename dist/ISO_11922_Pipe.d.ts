import { Pipe } from './Pipe';
import { Quantity } from '@neutrium/quantity';
export declare class ISO_11922_Pipe extends Pipe {
    static readonly SDR_DATA: {
        "PE80": {
            "3.2": number;
            "4": number;
            "6.3": number;
            "8": number;
            "10": number;
            "12.5": number;
            "16": number;
            "20": number;
        };
        "PE100": {
            "4": number;
            "6.3": number;
            "8": number;
            "10": number;
            "12.5": number;
            "16": number;
            "20": number;
            "25": number;
        };
    };
    static readonly NPS_DATA: number[];
    static readonly WT_DATA: {
        "41": number[];
        "33": number[];
        "26": number[];
        "21": number[];
        "17": number[];
        "13.6": number[];
        "11": number[];
        "9": number[];
        "7.4": number[];
    };
    readonly pn: string;
    readonly sdr: number;
    readonly compound: string;
    constructor(nps: string | Quantity, pn: string, compound?: string);
}
