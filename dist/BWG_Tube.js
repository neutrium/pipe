"use strict";
//
//	Birmingham Wire Gauge/Stubs Wire Gauge Tube
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
var BWG_Tube = /** @class */ (function (_super) {
    __extends(BWG_Tube, _super);
    // @param {string} ns - The nominal size of the pipe (NPS vs DN ?)
    // @param {string} schedule - The pipe schdule
    function BWG_Tube(od, guage) {
        var _this = this;
        od = new quantity_1.Quantity(od);
        if (!BWG_Tube.BWG_DATA.hasOwnProperty(guage)) {
            throw Error("Invalid birmingham wire gauge provided");
        }
        var wt = new quantity_1.Quantity(BWG_Tube.BWG_DATA[guage], "in").to(od.units());
        // od and wt are in metres at this point
        _this = _super.call(this, od, wt) || this;
        // Set additional Schedule pipe info
        _this.bwg = guage;
        return _this;
    }
    // BWG wall thickness data (inches)
    BWG_Tube.BWG_DATA = { "00000": 0.5, "5/0": 0.5, "0000": 0.454, "4/0": 0.454, "000": 0.425, "3/0": 0.425, "00": 0.38, "2/0": 0.38, "0": 0.34, "1": 0.3, "2": 0.284, "3": 0.259, "4": 0.238, "5": 0.22, "6": 0.203, "7": 0.18, "8": 0.165, "9": 0.148, "10": 0.134, "11": 0.12, "12": 0.109, "13": 0.095, "14": 0.083, "15": 0.072, "16": 0.065, "17": 0.058, "18": 0.049, "19": 0.042, "20": 0.035, "21": 0.032, "22": 0.028, "23": 0.025, "24": 0.022, "25": 0.02, "26": 0.018, "27": 0.016, "28": 0.014, "29": 0.013, "30": 0.012, "31": 0.01, "32": 0.009, "33": 0.008, "34": 0.007, "35": 0.005, "36": 0.004 };
    return BWG_Tube;
}(Pipe_1.Pipe));
exports.BWG_Tube = BWG_Tube;
