import { Pipe } from './Pipe';
import { Quantity } from '@neutrium/quantity';
export declare class ASTM_B88M_Tube extends Pipe {
    static readonly OD_DATA: number[];
    static readonly WT_DATA: {
        "A": number[];
        "B": number[];
        "C": number[];
    };
    readonly type: string;
    readonly nps: number;
    constructor(size: string | Quantity, type: string);
}
