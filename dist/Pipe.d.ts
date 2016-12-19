import { Quantity } from '@neutrium/quantity';
export declare class Pipe {
    readonly id: number;
    readonly od: number;
    readonly wt: number;
    readonly icsa: number;
    readonly ecsa: number;
    private unit;
    constructor(od: number | Quantity, wt: number | Quantity, unit?: string);
    raw(): {
        "id": number;
        "od": number;
        "icsa": number;
    };
}
