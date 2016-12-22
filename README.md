# Neutrium.pipe

The pipe module of the [Neutrium](https://neutrium.net) engineering library.

## Getting Started

### Installing

You can install NeutriumJS.Pipe using npm.

	npm install @neutrium/pipe --save

### Including

#### Typescript

You can include the NeutriumJS.Quantity module using an import statement in typescript:

    import {Pipe} from "@neutrium/pipe"

    let pipe = new Pipe();

This module is built with the declaration files so type hinting should work once the module has been imported.

#### Node

    var Pipe = require("@neutrium/pipe");

#### Browsers

The Pipe module is currently a commonjs (node) package. To use it in a browser environment you will need to use a tool like [browserify](http://browserify.org) to convert it to a web bundle and expose the Pipe object.

## Usage

### General Pipe

#### Creation

You can create a general pipe object by specifying an outer diameter and wall thickness as [@neutrium/quantity](https://github.com/neutrium/quantity) objects :

	// Pipe(<outer diameter>, <wall thickness>)
	let pipe = new Pipe(new Quantity("100mm", new Quantity("6mm"));

Alternatively you can specify the outer diameter and wall thickness using strings that will be converted to Quantity objects internally:

	let pipe = new Pipe("100mm", "6mm");

The pipe object will maintain unit consistency and where applicable will return all attributes in the units you specified for outer diameter.

#### Usage

Once the pipe object has been created you can access its attributes directly:

	pipe.od 	// The pipe outer diameter
	pipe.id 	// The pipe inner diameter
	pipe.wt 	// The pipe wall thickness
	pipe.icsa 	// The pipe internal cross sectional area
	pipe.ecsa 	// The pipe external cross sectional area

Each of these attributes are Quantity objects and can be readily converted to the desired unit using the `to()` method, by default the quantities will have the units specified for od and wt in the constructor. No special checking is performed to ensure unit consistency and therefore od and wall thickness could be returned in different units at the users digression.

The underlying scalar value of the quantity can be accessed using `pipe.od.scalar` which returns a [@neutrium/math](https://github.com/neutrium/math) Decimal or as a plain old javascript numbers using `pipe.od.scalar.toNumber()`.

If you are performing calculations that require maximum performance (e.g. iterative hydraulics) to can obtain the a plain javascript object containing the pipe attributes:

	let raw = pipe.raw();

You can also specify the unit you want all the attributes to be converted to (otherwise the units used for od will be used):

	let raw = pipe.raw("m");

The object returned from the raw method has the following structure:

	raw = {
		id: number,
		od: number,
		wt: number,
		icsa: number
	}

### NPS/DN Schedule Pipe (ASME/ANSI B36.10/19)

#### Creation

A Schedule pipe object is a subclass of the general pipe and can be created by providing the size (sting | Quantity) and the schedule (string):

	let pipe1 = SchedulePipe(new Quantity("100mm"), "40");
	let pipe2 = SchedulePipe("4in", "40");

The units of the pipe size will dictate whether NPS or DN nominal size is used for lookup. If the nominal size is provided in inches NPS nominal size will be used, for all other units the size will be converted to mm and DN nominal size will be used for lookup. This is an important distinction as schedule pipe nominal size is not an exact conversion. For example 4" NPS is equivalent to DN 100mm pipe, not 101.6mm as one would expect from a direct conversion.

If you attempt to create a schedule pipe with a invalid size and schedule combination an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) will be thrown.

#### Usage

Once a schedule pipe has been created you can use it as you would a general pipe object, however the schedule pipe has some additional information:

	pipe.schedule 		// The pipe schedule
	pipe.dn 			// The DN nominal size (millimeters)
	pipe.nps 			// The NPS nominal size (inches)