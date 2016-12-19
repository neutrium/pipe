import { typeguards } from "@neutrium/utilities";
import { Quantity } from '@neutrium/quantity'


let isNumber = typeguards.isNumber;

// Should this be an interface or a superclass -> could mean move utilities back into here (probably better to be an abstract class)
// Maybe not even make it abstract and use it as the general user defined pipe and the subclasses allow constructors with specific pipe parameters like DN and Sch
export class Pipe
{
    // Make these private and have external getters
    public readonly id      : number;   // The inner diameter (m)
    public readonly od      : number;   // The outer diameter (m)
    public readonly wt      : number;   // The wall thickness (m)
    public readonly icsa    : number;   // The internal cross sectional area (m^2)
    public readonly ecsa    : number;   // The external cross sectional area (m^2)
    private unit   : string;   // The preferred length unit to output as e.g. m, mm, in, ft (Any unit supported by Neutrium.Quanity)



    // @param {number | Quantity} od - The outer diameter
    // @param {number | Quantity} wt - The pipe wall thickness
    // @param {string?} unit - The unit to output results as (Default = metres)
    constructor(od: number | Quantity, wt : number | Quantity, unit : string = 'm')
    {
        this.unit = unit;

        if(typeguards.isNumber(od))
        {
            this.od = od;
        }
        else if(od instanceof Quantity)
        {
            this.od = od.to('m').scalar.toNumber();
        }
        else
        {
            // Complain
        }
        
        if(typeguards.isNumber(wt))
        {
            this.wt = wt;
        }
        else if(wt instanceof Quantity)
        {
            this.wt = wt.to('m').scalar.toNumber();
        }
        else
        {
            // Complain
        }

        // Calculate the rest of the properties
        this.id = this.od - 2*this.wt;
        this.icsa = Math.PI * (this.id * this.id)/4;
        this.ecsa = Math.PI * (this.od * this.od)/4;
    }

    public raw()
    {
        return {
            "id": this.id,
            "od": this.od,
            "icsa": this.icsa
        };
    }
}