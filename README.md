# Neutrium.pipe

The pipe module of the [Neutrium](https://neutrium.net) engineering library.

## Breaking Changes

### Version 2.*

Version 2 of this library saw the additon of the ASTM B88 standard and several breaking changes regarding naming conventions:

- The `SchedulePipe` object has been renamed to `ASME_B36_10_Pipe`.
- The `PEPipe` object has been renamed to `ISO_11922_Pipe`.

## Getting Started

### Installing

You can install NeutriumJS.Pipe using npm.

	npm install @neutrium/pipe --save

### Including

#### Typescript

You can include the NeutriumJS.Quantity module using an import statement in typescript:

    import { Pipe } from "@neutrium/pipe"

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
	let pipe = new Pipe(new Quantity("100mm"), new Quantity("6mm"));

Alternatively you can specify the outer diameter and wall thickness using strings that will be converted to Quantity objects internally:

	let pipe = new Pipe("100mm", "6mm");

The pipe object will maintain unit consistency and where applicable will return all attributes in the units used to specify outer diameter.

#### Usage

Once the pipe object has been created you can access its attributes directly:

	pipe.od 	// The pipe outer diameter
	pipe.id 	// The pipe inner diameter
	pipe.wt 	// The pipe wall thickness
	pipe.icsa 	// The pipe internal cross sectional area
	pipe.ecsa 	// The pipe external cross sectional area

Each of these attributes are Quantity objects and can be readily converted to a desired unit using the `to()` method, by default each quantity will have the units specified for od in the constructor with the exception of wt. No special checking is performed to ensure unit consistency and therefore od and wall thickness could be returned in different units at the users digression.

The underlying scalar value of the quantity can be accessed using the `scalar` property (e.g. `pipe.od.scalar`) which returns a [@neutrium/math](https://github.com/neutrium/math) Decimal or as a plain old javascript numbers using `pipe.od.scalar.toNumber()`.

While the big number implmentation of the Neutrium Decimal provides superior accuracy it has performance penalties. Therefore where maximum performance is required (i.e. for iterative hydraulic calculations) it is recommended to utilise the plain javascript object returned from the `raw()` method:

	let raw = pipe.raw();

You can also specify the unit you want the attributes to be returned as (otherwise the units used for od will be used):

	let raw = pipe.raw("m");

The object returned from the raw method has the following structure with each attribute being a javascript number:

	raw = {
		id: number,
		od: number,
		wt: number,
		icsa: number
	}

### NPS/DN Schedule Pipe (ASME/ANSI B36.10/19)

#### Creation

A Schedule pipe object is a subclass of the general pipe and can be created by providing the size (sting | Quantity) and the schedule (string):

	let pipe1 = ASME_B36_10_Pipe(new Quantity("100mm"), "40");
	let pipe2 = ASME_B36_10_Pipe("4in", "40");

The units of the pipe size will dictate whether NPS or DN nominal size is used for lookup. If the nominal size is provided in inches NPS nominal size will be used, for all other units the size will be converted to mm and DN nominal size will be used. This is an important distinction as schedule pipe nominal size is not an exact conversion. For example 4" NPS is equivalent to DN 100mm pipe, not 101.6mm as one would expect from a direct conversion.

If you attempt to create a schedule pipe with a invalid size and schedule combination an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) will be thrown.

#### Usage

Once a schedule pipe has been created you can use it as you would a general pipe object, however the schedule pipe has some additional information:

	pipe.schedule 		// The pipe schedule
	pipe.dn 			// The DN nominal size (millimeters)
	pipe.nps 			// The NPS nominal size (inches)

### Polyethylene Pipe (ISO 11922 & AS/NZS4130)

#### Creation

The `ISO_11922_Pipe` class is a subclass of the general pipe, it can be created by providing a suitable outer diameter and PN grade:

	let pipe = new ISO_11922_Pipe("25mm", "6");

You can also optionally supply the the compound type PE80 or PE100 (default):

	let pipe = new ISO_11922_Pipe("200mm", "10", "PE80");

If you attempt to create a PE pipe with a invalid size and PN rating combination an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) will be thrown.

#### Usage

Once a ISO_11922_Pipe object has been created you can use it as you would a general pipe object, however the PE pipe has some additional properties:

	pipe.pn 		// The nominal working pressure of the pipe/PN rating (in bar)
	pipe.compound	// The material used for the pipe (either PE80 or PE100)
	pipe.sdr		// The standard dimension ratio of the pipe

### Seamless Copper Water Tube (ASTM B88)

#### Creation

Due to variations in nominal diameter and wall thickness specified in the imperial (ASTM B88) and metric (ASTM B88M) versions of ASTM B88 standard, seamless copper tube can be created by providing a suitable nominal diameter and type (K, L & M for B88 and A, B, C for B88M) for the respective standard:

	// ASTM B88 - Imperial standard
	let tube1 = new ASTM_B88_Tube("1in", "K");
	// ASTM B88M - Metric version
	let tube2 = new ASTM_B88M_Tube("22mm", "A");

If you attempt to create a ASTM B88 tube with an invalid size and/or type an [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error) will be thrown.

#### Usage

Once a ASTM_B88(M)_Tube object has been created you can use it as you would a general pipe object, however the ASTM_B88(M)_Tube pipe has some additional properties:

	pipe.type 		// The ASTM B88/B88M type of the tube
	pipe.nps		// The nominal size of the tube (reported in units consistent with corresponding standard)

## Donations

NeutriumJS is free software, but you can support the developers by [donating here](https://neutrium.net/donate/).

## Release Notes

| Version | Notes |
|:-------:|:------|
| 1.0.0	  | Initial Release |
| 2.0.0	  | Addition of ASTM B88 and revision of API |

## License

[Creative Commons Attribution 4.0 International](http://creativecommons.org/licenses/by/4.0/legalcode)