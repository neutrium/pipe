"use strict";
var quantity_1 = require('@neutrium/quantity');
// Should this be an interface or a superclass -> could mean move utilities back into here (probably better to be an abstract class)
// Maybe not even make it abstract and use it as the general user defined pipe and the subclasses allow constructors with specific pipe parameters like DN and Sch
var Pipe = (function () {
    // @param {number | Quantity} od - The outer diameter
    // @param {number | Quantity} wt - The pipe wall thickness
    function Pipe(od, wt) {
        this.od = new quantity_1.Quantity(od);
        this.wt = new quantity_1.Quantity(wt);
        // Calculate the rest of the properties
        this.id = this.od.sub(this.wt.mul(2));
        this.icsa = this.id.mul(this.id).mul(Math.PI / 4);
        this.ecsa = this.od.mul(this.od).mul(Math.PI / 4);
    }
    Pipe.prototype.raw = function (unit) {
        var units = unit || this.od.units();
        return {
            "id": this.id.to(units).scalar.toNumber(),
            "od": this.id.to(units).scalar.toNumber(),
            "wt": this.wt.to(units).scalar.toNumber(),
            "icsa": this.icsa.to(units).scalar.toNumber()
        };
    };
    return Pipe;
}());
exports.Pipe = Pipe;
