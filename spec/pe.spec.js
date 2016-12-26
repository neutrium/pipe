var PEPipe = require('../dist/PEPipe').PEPipe;

describe("General PE Pipe tests", function() {

	it('Invalid od throws error ', function() {
        expect(function() { new PEPipe("410mm", "2")}).toThrow(new Error("Invalid outer diameter provided"));
    });

	it('Invalid od and PN rating combo throws error ', function() {
        expect(function() { new PEPipe("630mm", "16")}).toThrow(new Error("PN not available for provided outer diameter"));
    });

});

describe("Testing 25mm PN6 PE Pipe", function() {

    var pipe = new PEPipe("25mm", 6);

    it('Internal diameter correct ', function() {
        expect(pipe.id.scalar.toNumber()).toEqual(17);
    });

	it('Outer diameter correct ', function() {
        expect(pipe.od.scalar.toNumber()).toEqual(25);
    });

	it('Wall thickness correct ', function() {
        expect(pipe.wt.scalar.toNumber()).toEqual(4);
    });

	it('Internal cross sectional area correct ', function() {
        expect(pipe.icsa.scalar.toSignificantDigits(10).toNumber()).toEqual(226.9800692);
    });

	it('External cross sectional area correct ', function() {
        expect(pipe.ecsa.scalar.toSignificantDigits(10).toNumber()).toEqual(490.8738521);
    });
});
