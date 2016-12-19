var SchedulePipe = require('../dist/SchedulePipe').SchedulePipe;

describe("Test Schedule Pipe", function() {

    var pipe = new SchedulePipe("100", "40")

    it('should absolute value of ', function() {
        expect(pipe.id).toEqual(0.1022604);
    });

});