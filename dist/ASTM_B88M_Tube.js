"use strict";
//
//	ASTM B88M Seamless Copper Water Tube (Metric)
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
var ASTM_B88M_Tube = /** @class */ (function (_super) {
    __extends(ASTM_B88M_Tube, _super);
    // @param {string} ns - The nominal size of the pipe (NPS vs DN ?)
    // @param {string} type - The ASTM B88 designation 'K', 'L' or 'M'
    function ASTM_B88M_Tube(size, type) {
        var _this = this;
        var sizeQty = new quantity_1.Quantity(size), units = sizeQty.units() || "mm", od = null, wt = null, nomSize = null, index = null;
        nomSize = +sizeQty.to("mm").scalar.toFixed(0);
        // Get the DN size and outer diameter
        for (var i = 0, len = ASTM_B88M_Tube.OD_DATA.length; i < len; i++) {
            if (ASTM_B88M_Tube.OD_DATA[i] == nomSize) {
                index = i;
                break;
            }
        }
        if (index === null) {
            throw Error("Invalid nominal size provided");
        }
        if (!ASTM_B88M_Tube.WT_DATA.hasOwnProperty(type)) {
            throw Error("Invalid ASTM B88M type must be A, B or C");
        }
        od = new quantity_1.Quantity(ASTM_B88M_Tube.OD_DATA[index] + "mm").to(units);
        wt = ASTM_B88M_Tube.WT_DATA[type][index];
        if (!wt) {
            throw Error("Invalid combination of nominal size and ASTM B88 type");
        }
        wt = new quantity_1.Quantity(wt + "mm").to(units);
        // od and wt are in metres at this point
        _this = _super.call(this, od, wt) || this;
        // Set additional type and nominal size
        _this.type = type;
        _this.nps = nomSize;
        return _this;
    }
    // Nominal diameter (mm) - Index used for other parameters, nominal size and OD are the same
    ASTM_B88M_Tube.OD_DATA = [6, 8, 10, 12, 15, 18, 22, 28, 35, 42, 54, 67, 79, 105, 130, 156, 206, 257, 308];
    // Wall thickness data (inches)
    ASTM_B88M_Tube.WT_DATA = {
        "A": [0.8, 0.9, 0.9, 1.2, 1.2, 1.2, 1.6, 1.6, 1.6, 1.8, 2.1, 2.4, 2.8, 3.4, 4, 4.8, 6.8, 8.5, 10.3],
        "B": [0.7, 0.8, 0.8, 0.9, 1, 1, 1.1, 1.2, 1.4, 1.5, 1.7, 2, 2.3, 2.8, 3.1, 3.5, 5, 6.3, 7.1],
        "C": [0.6, 0.6, 0.6, 0.6, 0.7, 0.7, 0.8, 0.9, 1.1, 1.2, 1.5, 1.6, 1.8, 2.4, 2.7, 3.1, 4.3, 5.4, 6.4]
    };
    return ASTM_B88M_Tube;
}(Pipe_1.Pipe));
exports.ASTM_B88M_Tube = ASTM_B88M_Tube;
