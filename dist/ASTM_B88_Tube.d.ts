import { Pipe } from './Pipe';
import { Quantity } from '@neutrium/quantity';
export declare class ASTM_B88_Tube extends Pipe {
    static readonly NOMINAL_OD: number[];
    static readonly OD_DATA: number[];
    static readonly WT_DATA: {
        "K": number[];
        "L": number[];
        "M": number[];
    };
    readonly type: string;
    readonly nps: number;
    constructor(size: string | Quantity, type: string);
}
