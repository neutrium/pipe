"use strict";
//
//	EN 12201-2 Polyethylene (PE) pipes and fittings for water supply
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
var PEPipe = /** @class */ (function (_super) {
    __extends(PEPipe, _super);
    // @param {string} ns - The nominal size of the pipe (NPS vs DN ?)
    // @param {string} schedule - The pipe schdule
    // @param {boolean?} isImperial - Whether to use Imperial (NPS) or metric (DN) nominal size (Default false) - Could use a regex for DN or look for "
    function PEPipe(od, pn) {
        var _this = this;
        od = new quantity_1.Quantity(od);
        pn = "" + pn;
        var odStr = od.to("mm").scalar.toString();
        if (!PEPipe.WT_DATA.hasOwnProperty(odStr)) {
            throw Error("Invalid outer diameter provided");
        }
        var odData = PEPipe.WT_DATA[odStr];
        if (!odData.hasOwnProperty(pn)) {
            throw Error("PN not available for provided outer diameter");
        }
        var wt = new quantity_1.Quantity(odData[pn], "mm");
        // od and wt are in metres at this point
        _this = _super.call(this, od, wt) || this;
        // Set additional Schedule pipe info
        _this.pn = pn;
        return _this;
    }
    // PE Pipe wall thickness data to euro standards in millimetres <size>: {[<pn rating>: <wall thickness>]}
    PEPipe.WT_DATA = {
        "20": { "10": 2, "16": 2.8 },
        "25": { "6": 2, "10": 2.3, "16": 3.5 },
        "32": { "6": 2, "10": 2.9, "16": 4.4 },
        "40": { "4": 2, "6": 2.3, "10": 3.7, "16": 5.5 },
        "50": { "4": 2, "6": 2.9, "10": 4.6, "16": 6.9 },
        "63": { "2.5": 1.6, "4": 2.4, "6": 3.6, "10": 5.8, "16": 8.6 },
        "75": { "2.5": 1.9, "4": 2.9, "6": 4.3, "10": 6.8, "16": 10.3 },
        "90": { "2.5": 2.2, "4": 3.5, "6": 5.1, "10": 8.2, "16": 12.3 },
        "110": { "2.5": 2.7, "4": 4.2, "6": 6.3, "10": 10, "16": 15.1 },
        "125": { "2.5": 3.1, "4": 4.8, "6": 7.1, "10": 11.4, "16": 17.1 },
        "140": { "2.5": 3.5, "4": 5.4, "6": 8, "10": 12.7, "16": 19.2 },
        "160": { "2.5": 4, "4": 6.2, "6": 9.1, "10": 14.6, "16": 21.9 },
        "180": { "2.5": 4.4, "4": 6.9, "6": 10.2, "10": 16.4, "16": 24.6 },
        "200": { "2.5": 4.9, "4": 7.7, "6": 11.4, "10": 18.2, "16": 27.3 },
        "225": { "2.5": 5.5, "4": 8.6, "6": 12.9, "10": 20.5, "16": 30.8 },
        "250": { "2.5": 6.2, "4": 9.7, "6": 14.2, "10": 22.7, "16": 34.2 },
        "280": { "2.5": 6.9, "4": 10.7, "6": 15.9, "10": 25.4, "16": 38.3 },
        "315": { "2.5": 7.7, "4": 12.1, "6": 17.9, "10": 28.6, "16": 43 },
        "355": { "2.5": 8.7, "4": 13.6, "6": 20.1, "10": 32.2, "16": 48.5 },
        "400": { "2.5": 9.8, "4": 15.3, "6": 22.7, "10": 36.3, "16": 54.7 },
        "450": { "2.5": 11, "4": 17.2, "6": 25.5, "10": 40.9, "16": 61.5 },
        "500": { "2.5": 12.3, "4": 19.1, "6": 28.3, "10": 45.4 },
        "560": { "2.5": 13.7, "4": 21.4, "6": 31.7, "10": 50.8 },
        "630": { "2.5": 15.4, "4": 24.1, "6": 35.7, "10": 57.2 },
        "710": { "2.5": 17.4, "4": 27.2, "6": 40.2 },
        "800": { "2.5": 19.6, "4": 30.6, "6": 45.3 },
        "900": { "2.5": 22, "4": 34.4, "6": 51 },
        "1000": { "2.5": 24.5, "4": 38.2, "6": 56.5 },
        "1200": { "2.5": 29.4, "4": 45.9 },
        "1400": { "2.5": 34.3, "4": 53.5 },
        "1600": { "2.5": 39.2, "4": 61.2 },
    };
    return PEPipe;
}(Pipe_1.Pipe));
exports.PEPipe = PEPipe;
