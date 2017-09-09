//
//	ISO 11922 & AS/NZS 4130:2009 Polyethylene (PE) pipes for pressure applications
//

import { Pipe } from './Pipe'
import { Quantity } from '@neutrium/quantity';

export class ISO_11922_Pipe extends Pipe
{
	static readonly SDR_DATA = {
		"PE80": {"3.2": 41, "4": 33, "6.3": 21, "8": 17, "10": 13.6, "12.5": 11, "16": 9, "20": 7.4},
		"PE100": {"4": 41, "6.3": 26, "8": 21, "10": 17, "12.5": 13.6, "16": 11, "20": 9, "25": 7.4}
	};

	// The Nominal size and outdiameter are the same when assuming the minimum OD for AS/NZS 4130
	static readonly NPS_DATA = [16,20,25,32,40,50,63,75,90,110,125,140,160,180,200,225,250,280,315,355,400,450,500,560,630,710,800,900,1000,1200,1400,1600,1800,2000];

	// The minimum wall thickness data from AS/NZS 4130 for series 1 pipe (max wall thickness can be calculated as WTmax = 1.1 * WTmin + 0.1
	static readonly WT_DATA = {
		"41" : [-1,-1,-1,-1,-1,-1,-1,-1,-1,2.7,3.1,3.5,4,4.4,4.9,5.5,6.2,6.9,7.7,8.7,9.811,12.3,13.7,15.4,17.4,19.6,22,24.5,29.4,34.4,39.3,43.8,48.8,],
		"33" : [-1,-1,-1,-1,-1,-1,-1,2.3,2.8,3.4,3.9,4.3,4.9,5.5,6.2,6.9,7.7,8.6,9.7,10.9,12.3,13.8,15.3,17.2,19.3,21.8,24.5,27.6,30.6,36.7,42.9,49,54.5,60.6],
		"26" : [-1,-1,-1,-1,-1,-1,2.4,2.9,3.5,4.3,4.8,5.4,6.2,6.9,7.7,8.6,9.6,10.7,12.1,13.6,15.3,17.2,19.1,21.4,24.1,27.2,30.6,34.4,38.2,45.9,53.2,61.3,69.1,76.9],
		"21" : [-1,-1,-1,1.6,1.9,2.4,3,3.6,4.3,5.3,6,6.7,7.7,8.6,9.6,10.8,11.9,13.4,15,16.9,19.1,21.5,23.9,26.7,30,33.9,38.1,42.9,47.7,57.2,66.7,76.2,85.7,95.2],
		"17" : [-1,-1,1.6,1.9,2.4,3,3.8,4.5,5.4,6.6,7.4,8.3,9.5,10.7,11.9,13.4,14.8,16.6,18.7,21.1,23.7,26.7,29.6,33.2,37.3,42.1,47.4,53.5,59.3,67.9,82.4,94.1,105.9,117.6],
		"13.6" : [-1,1.6,1.9,2.4,3,3.7,4.7,5.5,6.6,8.1,9.2,10.3,11.8,13.3,14.7,16.6,18.4,20.6,23.2,26.1,29.4,33.1,36.8,41.2,46.3,52.2,58.8,66.2,72.5,88.2,102.9,117.6,-1,-1],
		"11" : [1.6,1.9,2.3,2.9,3.7,4.6,5.8,6.8,8.2,10,11.4,12.7,14.6,16.4,18.2,20.5,22.7,25.4,28.6,32.2,36.3,40.9,45.4,50.8,57.2,64.5,72.5,81.7,90.2,-1,-1,-1,-1,-1],
		"9" : [1.8,2.3,2.8,3.6,4.5,5.6,7.1,8.4,10.1,12.3,14,15.7,17.9,20.1,22.4,25.1,27.9,31.3,35.2,39.6,44.7,50.2,55.8,62.5,70.3,79.3,89.3,-1,-1,-1,-1,-1,-1,-1],
		"7.4" : [2.2,2.3,2.8,3.6,4.5,5.6,7.1,8.4,10.1,12.3,14,15.7,17.9,20.1,22.4,25.1,27.9,31.3,35.2,39.6,44.7,50.2,55.8,62.5,70.3,79.3,89.3,-1,-1,-1,-1,-1,-1,-1]
	};

	public readonly pn: string;
	public readonly sdr: number;
	public readonly compound: string;

    // @param {string} nps - The nominal size of the pipe
    // @param {string} pn - The nominal pressure rating
    // @param {string} compound - The Polyethylene compound PE80 or PE100
    constructor(nps : string | Quantity, pn : string, compound = "PE100")
    {
		if(!ISO_11922_Pipe.SDR_DATA.hasOwnProperty(compound))
		{
			throw Error("Invalid compound specified");
		}

		if(!ISO_11922_Pipe.SDR_DATA[compound].hasOwnProperty(pn))
		{
			throw Error("Invalid nominal pressure rating (PN) specified");
		}

		let sdr = ISO_11922_Pipe.SDR_DATA[compound][pn],
			npsQty = new Quantity(nps),
			units = npsQty.units() || "mm",
			wt = null,
			nomSize = +npsQty.to("mm").scalar.toFixed(0),
			index : number = ISO_11922_Pipe.NPS_DATA.indexOf(nomSize);

		if(index === -1)
		{
			throw Error("Invalid nominal size provided");
		}

		wt = ISO_11922_Pipe.WT_DATA[sdr][index];

		if(wt === -1)
		{
			throw Error("Invalid combination of PN rating and nominal size provided");
		}

		wt = new Quantity(wt, "mm").to(units);

		// od and wt are in metres at this point
        super(npsQty, wt);

		// Set additional Schedule pipe info
		this.compound = compound;
		this.pn = pn;
		this.sdr = sdr;
    }
}