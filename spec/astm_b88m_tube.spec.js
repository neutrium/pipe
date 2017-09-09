var ASTM_B88_Tube = require('../dist/ASTM_B88M_Tube').ASTM_B88M_Tube;

describe("General type tests", function() {

	it('Invalid type throws error ', function() {
        expect(function() { new ASTM_B88_Tube("10mm", "X")}).toThrow(new Error("Invalid ASTM B88M type must be A, B or C"));
    });
});

describe("Testing 100mm inch Type A", function() {

    var pipe = new ASTM_B88_Tube("10mm", "A");

    it('Internal diameter correct ', function() {
        expect(pipe.id.scalar.toNumber()).toEqual(8.2);
    });

	it('Outer diameter correct ', function() {
        expect(pipe.od.scalar.toNumber()).toEqual(10);
    });

	it('Wall thickness correct ', function() {
        expect(pipe.wt.scalar.toNumber()).toEqual(0.9);
    });

	it('Internal cross sectional area correct ', function() {
        expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(52.81017251);
    });

	it('External cross sectional area correct ', function() {
        expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(78.53981634);
    });
});

describe("Testing 10 mm Type A with alternate input units", function() {

	var pipe = new ASTM_B88_Tube("0.3937in", "A");

	it('Internal diameter correct ', function() {
		expect(pipe.id.scalar.toSignificantDigits(10).toNumber()).toEqual(0.3228346457);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.od.scalar.toSignificantDigits(10).toNumber()).toEqual(0.3937007874);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wt.scalar.toSignificantDigits(10).toNumber()).toEqual(0.03543307087);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(0.0818559311);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(0.1217369588);
	});
});

describe("Testing 100mm inch Type A raw(\"m\") output", function() {

	var pipe = new ASTM_B88_Tube("10mm", "A").raw("m");

	it('Internal diameter correct ', function() {
		expect(+pipe.id).toEqual(0.0082);
	});

	it('Outer diameter correct ', function() {
		expect(+pipe.od).toEqual(0.01);
	});

	it('Wall thickness correct ', function() {
		expect(+pipe.wt).toEqual(0.0009);
	});

	it('Internal cross sectional area correct ', function() {
		expect(+pipe.icsa.toFixed(14)).toEqual(0.00005281017251);
	});

	it('External cross sectional area correct ', function() {
		expect(+pipe.ecsa.toFixed(14)).toEqual(0.00007853981634);
	});
});