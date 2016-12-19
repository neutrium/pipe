"use strict";
var Utils = (function () {
    function Utils() {
    }
    // Calculate the cross sectional area of a pipe
    // @param {number} d The diameter (internal or external) of the pipe in meters
    // @returns {number} pipe external cross sectional area in m^2
    Utils.area = function (d) {
        return this.PI * (d * d) / 4;
    };
    // Calculate the volume of the Pipe given a diameter
    // @param {number} d The diameter (internal or external) of the pipe in meters
    // @returns {number} pipe volume in m^3
    Utils.volume = function (d) {
        return this.PI * (d * d) / 4 * 1;
    };
    return Utils;
}());
Utils.PI = Math.PI;
exports.Utils = Utils;
