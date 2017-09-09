var ASME_B36_10_Pipe = require('../dist/ASME_B36_10_Pipe').ASME_B36_10_Pipe;

describe("General Schedule Pipe tests", function() {

	it('Invalid size throws error ', function() {
        expect(function() { new ASME_B36_10_Pipe("42mm", "20")}).toThrow(new Error("Invalid pipe size provided"));
    });

	it('Invalid size and schedule combo throws error ', function() {
        expect(function() { new ASME_B36_10_Pipe("100mm", "20")}).toThrow(new Error("Invalid combination of pipe size and schedule provided"));
    });

});

describe("Testing DN 100mm Sch 40 Pipe", function() {

    var pipe = new ASME_B36_10_Pipe("100mm", "40");

    it('Internal diameter correct ', function() {
        expect(pipe.id.scalar.toNumber()).toEqual(102.2604);
    });

	it('Outer diameter correct ', function() {
        expect(pipe.od.scalar.toNumber()).toEqual(114.3);
    });

	it('Wall thickness correct ', function() {
        expect(pipe.wt.scalar.toNumber()).toEqual(6.0198);
    });

	it('Internal cross sectional area correct ', function() {
        expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(8213.057355);
    });

	it('External cross sectional area correct ', function() {
        expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(10260.82645);
    });
});

describe("Testing NPS 4in Sch 40 Pipe", function() {

    var pipe = new ASME_B36_10_Pipe("4in", "40");

    it('Internal diameter correct ', function() {
        expect(pipe.id.scalar.toNumber()).toEqual(4.026);
    });

	it('Outer diameter correct ', function() {
        expect(pipe.od.scalar.toNumber()).toEqual(4.5);
    });

	it('Wall thickness correct ', function() {
        expect(pipe.wt.scalar.toNumber()).toEqual(0.237);
    });

	it('Internal cross sectional area correct ', function() {
        expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(12.73026436);
    });

	it('External cross sectional area correct ', function() {
        expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(15.90431281);
    });

});

describe("Testing NPS 4inch Sch 40 Pipe raw(\"m\") output", function() {

    var pipe = new ASME_B36_10_Pipe("4in", "40").raw("m");

    it('Internal diameter correct ', function() {
        expect(pipe.id).toEqual(0.1022604);
    });

	it('Outer diameter correct ', function() {
        expect(pipe.od).toEqual(0.1143);
    });

	it('Wall thickness correct ', function() {
        expect(pipe.wt).toEqual(0.0060198);
    });

	it('Internal cross sectional area correct ', function() {
        expect(+pipe.icsa.toFixed(9)).toEqual(0.008213057);
    });

	it('External cross sectional area correct ', function() {
        expect(+pipe.ecsa.toFixed(9)).toEqual(0.010260826);
    });
});