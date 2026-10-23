import { Pipe, ASME_B36_10_Pipe as Steel, ASTM_B88_Tube as Copper, ASTM_B88M_Tube as Metric, ISO_11922_Pipe as PE, BWG_Tube as BWG, isPipeError } from '../src/index.js';
import type { ASTMB88Type, ASTMB88MType, PECompound, PressureRating, BWGGauge, NominalSizingSystem } from '../src/index.js';

const select = (id: string) => document.getElementById(id) as HTMLSelectElement;
const input = (id: string) => document.getElementById(id) as HTMLInputElement;
const element = (id: string) => document.getElementById(id)!;
const standard = select('standard'), size = select('size'), designation = select('designation');
const system = select('system'), compound = select('compound');

function options(control: HTMLSelectElement, values: readonly (string | number)[], preferred = control.value)
{
	control.replaceChildren(...values.map(value => new Option(String(value), String(value))));

	if (values.some(value => String(value) === preferred))
	{
		control.value = preferred;
	}
}

function syncSizes(preferred?: string)
{
	const sizes = standard.value === 'steel' ? Steel.availableSizes(system.value as NominalSizingSystem)
	: standard.value === 'copper' ? Copper.availableSizes()
	: standard.value === 'metric' ? Metric.availableSizes()
	: standard.value === 'pe' ? PE.availableSizes(undefined, compound.value as PECompound) : [];
	options(size, sizes, preferred);
	syncDesignations();
}

function syncDesignations(preferred?: string)
{
	const value = Number(size.value);
	const values = standard.value === 'steel' ? Steel.availableSchedules(value, system.value as NominalSizingSystem)
		: standard.value === 'copper' ? Copper.availableTypes(value)
		: standard.value === 'metric' ? Metric.availableTypes(value)
		: standard.value === 'pe' ? PE.availablePressureRatings(value, compound.value as PECompound)
		: standard.value === 'bwg' ? BWG.availableGauges() : [];
	options(designation, values, preferred);
}

function configure(preferredSize?: string, preferredDesignation?: string)
{
	const kind = standard.value;
	for (const [id, visible] of Object.entries({ 'system-field': kind === 'steel', 'compound-field': kind === 'pe', 'size-field': !['custom', 'bwg'].includes(kind), 'designation-field': kind !== 'custom', 'od-field': ['custom', 'bwg'].includes(kind), 'wall-field': kind === 'custom' }))
	{
		element(id).hidden = !visible;
	}

	element('size-label').textContent = kind === 'steel' ? `Nominal size · ${system.value}` : kind === 'copper' ? 'Nominal size · in' : 'Nominal size · mm';
	element('designation-label').textContent = kind === 'steel' ? 'Schedule' : kind === 'pe' ? 'Pressure rating · PN' : kind === 'bwg' ? 'BWG gauge' : 'Tube type';
	syncSizes(preferredSize);

	if (preferredDesignation)
	{
		syncDesignations(preferredDesignation);
	}

	render();
}

function render()
{
	const error = element('error');

	try
	{
		let pipe: Pipe, expression: string, className: string;
		const n = Number(size.value), d = designation.value, kind = standard.value;
		const quote = JSON.stringify;

		if (kind === 'steel')
		{
			className = 'ASME_B36_10_Pipe';
			pipe = system.value === 'DN' ? Steel.fromDN(n, d) : Steel.fromNPS(n, d);
			expression = `${className}.from${system.value}(${n}, ${quote(d)})`;
		}
		else if (kind === 'copper')
		{
			className = 'ASTM_B88_Tube'; pipe = new Copper(`${n}in`, d as ASTMB88Type); expression = `new ${className}(${quote(`${n}in`)}, ${quote(d)})`;
		}
		else if (kind === 'metric')
		{
			className = 'ASTM_B88M_Tube'; pipe = new Metric(`${n}mm`, d as ASTMB88MType); expression = `new ${className}(${quote(`${n}mm`)}, ${quote(d)})`;
		}
		else if (kind === 'pe')
		{
			className = 'ISO_11922_Pipe'; pipe = new PE(`${n}mm`, d as PressureRating, compound.value as PECompound); expression = `new ${className}(${quote(`${n}mm`)}, ${quote(d)}, ${quote(compound.value)})`;
		}
		else if (kind === 'bwg')
		{
			className = 'BWG_Tube'; pipe = new BWG(input('od').value, d as BWGGauge); expression = `new ${className}(${quote(input('od').value)}, ${quote(d)})`;
		}
		else
		{
			className = 'Pipe'; pipe = new Pipe(input('od').value, input('wall').value); expression = `new Pipe(${quote(input('od').value)}, ${quote(input('wall').value)})`;
		}

		const unit = select('units').value;
		const length = input('length').value, density = input('density').value;
		const format = (quantity: typeof pipe.outerDiameter, target: string, label = target) => `${quantity.to(target).scalar.toSD(7).toString()} ${label}`;
		const area = `${unit}^2`;
		const dimensions = [ ['Outer diameter', format(pipe.outerDiameter, unit)], ['Internal diameter', format(pipe.internalDiameter, unit)], ['Wall thickness', format(pipe.wallThickness, unit)] ];
		const metrics = [ ['Bore area', format(pipe.internalCrossSectionalArea, area, `${unit}²`)], ['Material area', format(pipe.materialCrossSectionalArea, area, `${unit}²`)], ['Internal volume', format(pipe.internalVolume(length), unit === 'mm' ? 'L' : 'in^3', unit === 'mm' ? 'L' : 'in³')], ['Dry material mass', format(pipe.mass(length, density), unit === 'mm' ? 'kg' : 'lb')] ];
		element('dimensions').replaceChildren(...dimensions.flatMap(([label, value]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label!; dd.textContent = value!; return [dt, dd]; }));
		element('metrics').replaceChildren(...metrics.map(([label, value]) => { const card = document.createElement('div'); card.className = 'metric'; const title = document.createElement('span'), result = document.createElement('strong'); title.textContent = label!; result.textContent = value!; card.append(title, result); return card; }));
		element('bore').setAttribute('r', String(112 * pipe.internalDiameter.div(pipe.outerDiameter).scalar.toNumber()));
		element('diameter-caption').textContent = `OD ${dimensions[0]![1]}`;
		element('code-output').textContent = `import { ${className} } from '@neutrium/pipe';\n\nconst pipe = ${expression};\n\n// Numeric geometry in ${unit}\nconst geometry = pipe.raw(${quote(unit)});\n\n// Unit-aware segment calculations\nconst volume = pipe.internalVolume(${quote(length)});\nconst mass = pipe.mass(\n  ${quote(length)},\n  ${quote(density)}\n);\n\nconsole.log(geometry);\nconsole.log(volume.to(${quote(unit === 'mm' ? 'L' : 'in^3')}));\nconsole.log(mass.to(${quote(unit === 'mm' ? 'kg' : 'lb')}));`;
		error.hidden = true; element('results').hidden = false; (element('copy-code') as HTMLButtonElement).disabled = false;
	}
	catch (cause)
	{
		error.textContent = isPipeError(cause) ? `${cause.field}: ${cause.message}` : cause instanceof Error ? cause.message : String(cause);
		error.hidden = false; element('results').hidden = true; element('code-output').textContent = '// Correct the input to generate an example.'; (element('copy-code') as HTMLButtonElement).disabled = true;
	}
}

element('pipe-form').addEventListener('submit', event => event.preventDefault());
element('pipe-form').addEventListener('input', event => {
	element('copy-status').textContent = '';

	if (event.target === standard || event.target === system || event.target === compound)
	{
		configure();
	}
	else
	{
		if (event.target === size)
		{
			syncDesignations();
		}
		render();
	}
});

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-preset]'))
{
	button.addEventListener('click', () => {
		standard.value = button.dataset.preset!; system.value = 'DN'; compound.value = 'PE100';
		input('density').value = standard.value === 'copper' ? '8960kg/m^3' : standard.value === 'pe' ? '950kg/m^3' : '7850kg/m^3';
		input('length').value = '6m'; input('od').value = '100mm'; input('wall').value = '6mm';
		configure(standard.value === 'steel' ? '100' : standard.value === 'copper' ? '1' : '110', standard.value === 'steel' ? '40' : standard.value === 'copper' ? 'L' : '10');
	});
}

element('copy-code').addEventListener('click', async () => {
	try
	{
		await navigator.clipboard.writeText(element('code-output').textContent!); element('copy-status').textContent = 'Code copied.';
	}
	catch
	{
		element('copy-status').textContent = 'Clipboard unavailable. Select and copy the code above.';
	}
});

configure('100', '40');
