"use strict";
var utilities_1 = require("@neutrium/utilities");
var quantity_1 = require("@neutrium/quantity");
var isNumber = utilities_1.typeguards.isNumber;
// Should this be an interface or a superclass -> could mean move utilities back into here (probably better to be an abstract class)
// Maybe not even make it abstract and use it as the general user defined pipe and the subclasses allow constructors with specific pipe parameters like DN and Sch
var Pipe = (function () {
    // @param {number | Quantity} od - The outer diameter
    // @param {number | Quantity} wt - The pipe wall thickness
    // @param {string?} unit - The unit to output results as (Default = metres)
    function Pipe(od, wt, unit) {
        if (unit === void 0) { unit = 'm'; }
        this.unit = unit;
        if (utilities_1.typeguards.isNumber(od)) {
            this.od = od;
        }
        else if (od instanceof quantity_1.Quantity) {
            this.od = od.to('m').scalar.toNumber();
        }
        else {
        }
        if (utilities_1.typeguards.isNumber(wt)) {
            this.wt = wt;
        }
        else if (wt instanceof quantity_1.Quantity) {
            this.wt = wt.to('m').scalar.toNumber();
        }
        else {
        }
        // Calculate the rest of the properties
        this.id = this.od - 2 * this.wt;
        this.icsa = Math.PI * (this.id * this.id) / 4;
        this.ecsa = Math.PI * (this.od * this.od) / 4;
    }
    Pipe.prototype.raw = function () {
        return {
            "id": this.id,
            "od": this.od,
            "icsa": this.icsa
        };
    };
    return Pipe;
}());
exports.Pipe = Pipe;
