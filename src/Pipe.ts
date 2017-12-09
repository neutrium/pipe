import { Quantity } from '@neutrium/quantity'

export class Pipe
{
    // Make these private and have external getters
    public readonly id      : Quantity; // The inner diameter (m)
    public readonly od      : Quantity; // The outer diameter (m)
    public readonly wt      : Quantity; // The wall thickness (m)
    public readonly icsa    : Quantity; // The internal cross sectional area (m^2)
    public readonly ecsa    : Quantity;	// The external cross sectional area (m^2)

    // @param {number | Quantity} od - The outer diameter
    // @param {number | Quantity} wt - The pipe wall thickness
    constructor(od: string | Quantity, wt : number | Quantity)
    {
		this.od = new Quantity(od);
		this.wt = new Quantity(wt);

        // Calculate the rest of the properties
        this.id = this.od.sub(this.wt.mul(2));
		this.icsa = this.id.mul(this.id).mul(Math.PI/4);
        this.ecsa = this.od.mul(this.od).mul(Math.PI/4);
    }

    public raw(unit?: string)
    {
		let units = unit || this.od.units();

        return {
            "id": this.id.to(units).scalar.toNumber(),
            "od": this.od.to(units).scalar.toNumber(),
			"wt": this.wt.to(units).scalar.toNumber(),
            "icsa": this.icsa.to(units + "^2").scalar.toNumber(),
			"ecsa": this.ecsa.to(units + "^2").scalar.toNumber()
        };
    }
}