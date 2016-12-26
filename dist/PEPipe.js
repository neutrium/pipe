"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Pipe_1 = require('./Pipe');
var quantity_1 = require('@neutrium/quantity');
var PEPipe = (function (_super) {
    __extends(PEPipe, _super);
    // @param {string} ns - The nominal size of the pipe (NPS vs DN ?)
    // @param {string} schedule - The pipe schdule
    // @param {boolean?} isImperial - Whether to use Imperial (NPS) or metric (DN) nominal size (Default false) - Could use a regex for DN or look for "
    function PEPipe(od, pn) {
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
        _super.call(this, od, wt);
        // Set additional Schedule pipe info
        this.pn = pn;
    }
    // PE Pipe wall thickness data to euro standards in millimetres <size>: {[<pn rating>: <wall thickness>]}
    PEPipe.WT_DATA = {
        "20": { "10": 4, "16": 5.6 },
        "25": { "6": 4, "10": 4.6, "16": 7 },
        "32": { "6": 4, "10": 5.8, "16": 8.8 },
        "40": { "4": 4, "6": 4.6, "10": 7.4, "16": 11 },
        "50": { "4": 4, "6": 5.8, "10": 9.2, "16": 13.8 },
        "63": { "2.5": 3.2, "4": 4.8, "6": 7.2, "10": 11.6, "16": 17.2 },
        "75": { "2.5": 3.8, "4": 5.8, "6": 8.6, "10": 13.6, "16": 20.6 },
        "90": { "2.5": 4.4, "4": 7, "6": 10.2, "10": 16.4, "16": 24.6 },
        "110": { "2.5": 5.4, "4": 8.4, "6": 12.6, "10": 20, "16": 30.2 },
        "125": { "2.5": 6.2, "4": 9.6, "6": 14.2, "10": 22.8, "16": 34.2 },
        "140": { "2.5": 7, "4": 10.8, "6": 16, "10": 25.4, "16": 38.4 },
        "160": { "2.5": 8, "4": 12.4, "6": 18.2, "10": 29.2, "16": 43.8 },
        "180": { "2.5": 8.8, "4": 13.8, "6": 20.4, "10": 32.8, "16": 49.2 },
        "200": { "2.5": 9.8, "4": 15.4, "6": 22.8, "10": 36.4, "16": 54.6 },
        "225": { "2.5": 11, "4": 17.2, "6": 25.8, "10": 41, "16": 61.6 },
        "250": { "2.5": 12.4, "4": 19.3, "6": 28.4, "10": 45.4, "16": 68.4 },
        "280": { "2.5": 13.8, "4": 21.4, "6": 31.8, "10": 50.8, "16": 76.6 },
        "315": { "2.5": 15.4, "4": 24.2, "6": 35.8, "10": 57.2, "16": 86 },
        "355": { "2.5": 17.4, "4": 27.2, "6": 40.2, "10": 64.4, "16": 97 },
        "400": { "2.5": 19.6, "4": 30.6, "6": 45.4, "10": 72.6, "16": 109.4 },
        "450": { "2.5": 22, "4": 34.4, "6": 51, "10": 81.8, "16": 123 },
        "500": { "2.5": 24.6, "4": 38.2, "6": 56.6, "10": 90.8 },
        "560": { "2.5": 27.4, "4": 42.8, "6": 63.4, "10": 101.6 },
        "630": { "2.5": 30.8, "4": 48.2, "6": 71.4, "10": 114.4 },
        "710": { "2.5": 34.8, "4": 54.4, "6": 80.4 },
        "800": { "2.5": 39.2, "4": 61.2, "6": 90.6 },
        "900": { "2.5": 44, "4": 68.8, "6": 102 },
        "1000": { "2.5": 49, "4": 76.4, "6": 113 },
        "1200": { "2.5": 58.8, "4": 91.8 },
        "1400": { "2.5": 68.6, "4": 107 },
        "1600": { "2.5": 78.4, "4": 122.4 },
    };
    return PEPipe;
}(Pipe_1.Pipe));
exports.PEPipe = PEPipe;
