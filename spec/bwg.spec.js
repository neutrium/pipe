var BWGTube = require('../dist/BWGTube').BWGTube;

describe("General BWG Tube tests", function() {

	it('Invalid guage throws error ', function() {
        expect(function() { new BWGTube("0.25in", "100")}).toThrow(new Error("Invalid birmingham wire gauge provided"));
    });
});

describe("Testing BWG Tube", function() {

    var pipe = new BWGTube("1in", "00");

    it('Internal diameter correct ', function() {
        expect(pipe.id.scalar.toNumber()).toEqual(0.24);
    });

	it('Outer diameter correct ', function() {
        expect(pipe.od.scalar.toNumber()).toEqual(1);
    });

	it('Wall thickness correct ', function() {
        expect(pipe.wt.scalar.toNumber()).toEqual(0.380);
    });

	it('Internal cross sectional area correct ', function() {
        expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(0.04523893421);
    });

	it('External cross sectional area correct ', function() {
        expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(0.7853981634);
    });
});
