var ASTM_B88_Tube = require('../dist/ASTM_B88_Tube').ASTM_B88_Tube;

describe("General type tests", function() {

	it('Invalid type throws error ', function() {
        expect(function() { new ASTM_B88_Tube("0.25in", "X")}).toThrow(new Error("Invalid ASTM B88 type must be K, L or M"));
    });

	it('Invalid size and type combo throws error ', function() {
        expect(function() { new ASTM_B88_Tube("0.25in", "M")}).toThrow(new Error("Invalid combination of nominal size and ASTM B88 type"));
    });
});

describe("Testing 3/4 inch Type K", function() {

    var pipe = new ASTM_B88_Tube("0.75in", "K");

    it('Internal diameter correct ', function() {
        expect(pipe.id.scalar.toNumber()).toEqual(0.745);
    });

	it('Outer diameter correct ', function() {
        expect(pipe.od.scalar.toNumber()).toEqual(0.875);
    });

	it('Wall thickness correct ', function() {
        expect(pipe.wt.scalar.toNumber()).toEqual(0.065);
    });

	it('Internal cross sectional area correct ', function() {
        expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(0.4359156156);
    });

	it('External cross sectional area correct ', function() {
        expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(0.6013204689);
    });
});

describe("Testing 3/4 inch Type K with alternate input units", function() {

	var pipe = new ASTM_B88_Tube("19.05mm", "K");

	it('Internal diameter correct ', function() {
		expect(pipe.id.scalar.toNumber()).toEqual(18.923);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.od.scalar.toNumber()).toEqual(22.225);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wt.scalar.toNumber()).toEqual(1.651);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(281.2353186);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(387.9479137);
	});
});

describe("Testing 3/4 inch Type K raw(\"m\") output", function() {

	var pipe = new ASTM_B88_Tube(".75in", "K").raw("m");

	it('Internal diameter correct ', function() {
		expect(+pipe.id).toEqual(0.018923);
	});

	it('Outer diameter correct ', function() {
		expect(+pipe.od).toEqual(0.022225);
	});

	it('Wall thickness correct ', function() {
		expect(+pipe.wt).toEqual(0.001651);
	});

	it('Internal cross sectional area correct ', function() {
		expect(+pipe.icsa.toFixed(13)).toEqual(0.0002812353186);
	});

	it('External cross sectional area correct ', function() {
		expect(+pipe.ecsa.toFixed(13)).toEqual(0.0003879479137);
	});
});

describe("Testing 1 inch Type K", function() {

	var pipe = new ASTM_B88_Tube("1in", "K");

	it('Internal diameter correct ', function() {
		expect(pipe.id.scalar.toNumber()).toEqual(0.995);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.od.scalar.toNumber()).toEqual(1.125);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wt.scalar.toNumber()).toEqual(0.065);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(0.7775638167);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(0.9940195505);
	});
});