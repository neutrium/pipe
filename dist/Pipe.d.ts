import { Quantity } from '@neutrium/quantity';
export declare class Pipe {
    readonly id: Quantity;
    readonly od: Quantity;
    readonly wt: Quantity;
    readonly icsa: Quantity;
    readonly ecsa: Quantity;
    constructor(od: string | Quantity, wt: number | Quantity);
    raw(unit?: string): {
        "id": any;
        "od": any;
        "wt": any;
        "icsa": any;
        "ecsa": any;
    };
}
