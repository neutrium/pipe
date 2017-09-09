var ISO_11922_Pipe = require('../dist/ISO_11922_Pipe').ISO_11922_Pipe;

describe("General ISO 11922 PE Pipe COnstructor Tests", function() {

	it('Invalid size throws error ', function() {
		expect(function() { new ISO_11922_Pipe("110", "3.2", "PE100")}).toThrow(new Error("Invalid nominal pressure rating (PN) specified"));
	});

	it('Invalid nominal throws error ', function() {
		expect(function() { new ISO_11922_Pipe("100mm", "4")}).toThrow(new Error("Invalid nominal size provided"));
	});

	it('Invalid size and PN type combo throws error ', function() {
		expect(function() { new ISO_11922_Pipe("90mm", "4")}).toThrow(new Error("Invalid combination of PN rating and nominal size provided"));
	});
});


describe("Testing PN10 200mm Pipe", function() {

    var pipe = new ISO_11922_Pipe("200mm", "10");

    it('Internal diameter correct ', function() {
        expect(pipe.id.scalar.toNumber()).toEqual(176.2);
    });

	it('Outer diameter correct ', function() {
        expect(pipe.od.scalar.toNumber()).toEqual(200);
    });

	it('Wall thickness correct ', function() {
        expect(pipe.wt.scalar.toNumber()).toEqual(11.9);
    });

	it('Internal cross sectional area correct ', function() {
        expect(pipe.icsa.scalar.toSignificantDigits(13).toNumber()).toEqual(24383.81695603);
    });

	it('External cross sectional area correct ', function() {
        expect(pipe.ecsa.scalar.toSignificantDigits(13).toNumber()).toEqual(31415.92653590);
    });
});

describe("Testing PN10 200mm Pipe with alternate input units", function() {

	var pipe = new ISO_11922_Pipe("7.874015748in", "10");

	it('Internal diameter correct ', function() {
		expect(pipe.id.scalar.toSignificantDigits(10).toNumber()).toEqual(6.937007874);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.od.scalar.toSignificantDigits(10).toNumber()).toEqual(7.874015748);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wt.scalar.toSignificantDigits(10).toNumber()).toEqual(0.468503937);
	});

	it('Internal cross sectional area correct ', function() {
		expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(37.79499187);
	});

	it('External cross sectional area correct ', function() {
		expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(48.69478352);
	});
});

describe("Testing 100mm inch Type A raw(\"m\") output", function() {

	var pipe = new ISO_11922_Pipe("200mm", "10").raw("m");

	it('Internal diameter correct ', function() {
		expect(pipe.id).toEqual(0.1762);
	});

	it('Outer diameter correct ', function() {
		expect(pipe.od).toEqual(0.200);
	});

	it('Wall thickness correct ', function() {
		expect(pipe.wt).toEqual(0.0119);
	});

	it('Internal cross sectional area correct ', function() {
		expect(+pipe.icsa.toFixed(10)).toEqual(0.0243838170);
	});

	it('External cross sectional area correct ', function() {
		expect(+pipe.ecsa.toFixed(10)).toEqual(0.0314159265);
	});
});
