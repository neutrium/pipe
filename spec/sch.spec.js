var SchedulePipe = require('../dist/SchedulePipe').SchedulePipe;

describe("General Schedule Pipe tests", function() {

	it('Invalid size throws error ', function() {
        expect(function() { new SchedulePipe("42mm", "20")}).toThrow(new Error("Invalid pipe size provided"));
    });

	it('Invalid size and schedule combo throws error ', function() {
        expect(function() { new SchedulePipe("100mm", "20")}).toThrow(new Error("Invalid combination of pipe size and schedule provided"));
    });

});

describe("Testing DN 100mm Sch40 Pipe", function() {

    var pipe = new SchedulePipe("100mm", "40");

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

describe("Testing NPS 4in Sch40 Pipe", function() {

    var pipe = new SchedulePipe("4in", "40");

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