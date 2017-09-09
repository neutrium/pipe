"use strict";
//
//	ASTM B88 Seamless Copper Water Tube
//
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Pipe_1 = require("./Pipe");
var quantity_1 = require("@neutrium/quantity");
var ASTM_B88_Tube = /** @class */ (function (_super) {
    __extends(ASTM_B88_Tube, _super);
    // @param {string} ns - The nominal size of the pipe (NPS vs DN ?)
    // @param {string} type - The ASTM B88 designation 'K', 'L' or 'M'
    function ASTM_B88_Tube(size, type) {
        var _this = this;
        var sizeQty = new quantity_1.Quantity(size), units = sizeQty.units() || "in", od = null, wt = null, nomSize = null, index = null;
        nomSize = +sizeQty.to("in").scalar.toFixed(3);
        // Get the DN size and outer diameter
        for (var i = 0, len = ASTM_B88_Tube.NOMINAL_OD.length; i < len; i++) {
            if (ASTM_B88_Tube.NOMINAL_OD[i] == nomSize) {
                index = i;
                break;
            }
        }
        if (index === null) {
            throw Error("Invalid nominal size provided");
        }
        if (!ASTM_B88_Tube.WT_DATA.hasOwnProperty(type)) {
            throw Error("Invalid ASTM B88 type must be K, L or M");
        }
        od = new quantity_1.Quantity(ASTM_B88_Tube.OD_DATA[index] + "in").to(units);
        wt = ASTM_B88_Tube.WT_DATA[type][index];
        if (!wt) {
            throw Error("Invalid combination of nominal size and ASTM B88 type");
        }
        wt = new quantity_1.Quantity(wt + "in").to(units);
        // od and wt are in metres at this point
        _this = _super.call(this, od, wt) || this;
        // Set additional type and nominal size
        _this.type = type;
        _this.nps = nomSize;
        return _this;
    }
    // Nominal diameter (inches) - Index used for other parameters
    ASTM_B88_Tube.NOMINAL_OD = [0.25, 0.375, 0.5, 0.625, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12];
    // Outer diameter (inches)
    ASTM_B88_Tube.OD_DATA = [0.375, 0.5, 0.625, 0.75, 0.875, 1.125, 1.375, 1.625, 2.125, 2.625, 3.125, 3.625, 4.125, 5.125, 6.125, 8.125, 10.125, 12.125];
    // Wall thickness data (inches)
    ASTM_B88_Tube.WT_DATA = {
        "K": [0.035, 0.049, 0.049, 0.049, 0.065, 0.065, 0.065, 0.072, 0.083, 0.095, 0.109, 0.12, 0.134, 0.16, 0.192, 0.271, 0.338, 0.405],
        "L": [0.030, 0.035, 0.04, 0.042, 0.045, 0.05, 0.055, 0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.125, 0.14, 0.2, 0.25, 0.28],
        "M": [null, 0.025, 0.028, null, 0.032, 0.035, 0.042, 0.049, 0.058, 0.065, 0.072, 0.083, 0.095, 0.109, 0.122, 0.17, 0.212, 0.254]
    };
    return ASTM_B88_Tube;
}(Pipe_1.Pipe));
exports.ASTM_B88_Tube = ASTM_B88_Tube;
