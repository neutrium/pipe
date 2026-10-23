import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

const repository = fileURLToPath(new URL('../', import.meta.url));
const catalogues = [
	['ASME_B36_10_Pipe', Class => Class.fromDN(100, 40), '102.2604mm', ['OD_DATA', 'WT_DATA']],
	['ASTM_B88_Tube', Class => new Class('1in', 'L'), '1.025in', ['NOMINAL_OD', 'OD_DATA', 'WT_DATA']],
	['ASTM_B88M_Tube', Class => new Class('22mm', 'B'), '19.8mm', ['OD_DATA', 'WT_DATA']],
	['ISO_11922_Pipe', Class => new Class('200mm', '10'), '176.2mm', ['SDR_DATA', 'NOMINAL_SIZE_DATA', 'WT_DATA']],
	['BWG_Tube', Class => new Class('1in', '16'), '0.87in', ['BWG_DATA']],
];

function assertFrozenGraph(value)
{
	if(value === null || typeof value !== 'object') return;
	assert.ok(Object.isFrozen(value), 'Retained catalogue data must be recursively frozen');
	for(const child of Object.values(value)) assertFrozenGraph(child);
}

/** Test real package resolution and metadata, both in the checkout and an installed archive. */
export async function testTreeShaking(consumer = repository)
{
	const require = createRequire(join(consumer, 'package.json'));
	const packageRoot = dirname(require.resolve('@neutrium/pipe/package.json'));
	const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
	assert.equal(manifest.sideEffects, false, 'The published manifest must declare sideEffects: false');
	const results = [];

	async function bundle(symbol, subpath, expectedCatalogues = [], fixture)
	{
		const entry = join(consumer, '__tree_shaking_consumer__.js');
		// Only provide an in-memory consumer. Do not override package resolution,
		// moduleSideEffects, dependency externalization or bundler purity settings.
		const generated = await build({
			root: consumer, configFile: false, envFile: false, logLevel: 'silent',
			plugins: [{
				name: 'tree-shaking-consumer',
				resolveId(id) { if(id === entry) return id; },
				load(id) {
					if(id === entry) return `import { ${symbol} } from '@neutrium/pipe${subpath}'; export { ${symbol} }; ${fixture?.source ?? ''}`;
				},
			}],
			build: {
				write: false, minify: true, target: 'es2022',
				rolldownOptions: { input: entry, preserveEntrySignatures: 'strict', output: { format: 'es' } },
			},
		});
		const chunks = (Array.isArray(generated) ? generated : [generated])
			.flatMap(result => result.output).filter(output => output.type === 'chunk');
		assert.equal(chunks.length, 1, 'Each fixture must be a self-contained browser bundle');
		const chunk = chunks[0];
		assert.deepEqual(chunk.imports, []);
		assert.deepEqual(chunk.dynamicImports, []);
		const retained = Object.entries(chunk.modules)
			.filter(([, module]) => module.renderedLength > 0)
			.map(([id]) => relative(packageRoot, id).replaceAll('\\', '/'));
		const retainedCatalogues = catalogues.map(([name]) => name)
			.filter(name => retained.includes(`dist/pipes/${name}.js`));
		assert.deepEqual(retainedCatalogues.sort(), [...expectedCatalogues].sort(), `${symbol}${subpath}: unexpected catalogue retention`);

		if(symbol === 'finiteNumber')
		{
			assert.ok(!retained.some(id => /^dist\/(pipes|connections|components|fittings|valves)\//.test(id)), 'Scalar validation must exclude geometry and components');
			assert.ok(!Object.keys(chunk.modules).some(id => /node_modules\/@neutrium\/(quantity|decimal)\//.test(id) && chunk.modules[id].renderedLength > 0), 'Scalar validation must exclude Quantity and Decimal');
		}

		if(symbol === 'Pipe')
		{
			assert.ok(retained.includes('dist/pipes/Pipe.js'));
			assert.ok(!retained.includes('dist/pipes/PipeComponent.js'), 'Pipe must exclude its component adapter');
			assert.ok(!retained.some(id => /^dist\/(connections|components|fittings|valves)\//.test(id)), 'Pipe must exclude components');
		}
		if(symbol === 'Port')
		{
			assert.ok(!retained.some(id => /^dist\/(pipes|components|fittings|valves)\//.test(id)), 'Port must exclude pipes and components');
		}
		if(fixture)
		{
			const featureModules = retained.filter(id => /^dist\/(pipes|connections|components|fittings|valves)\//.test(id));
			assert.deepEqual(featureModules.sort(), [...fixture.modules].sort(), `${symbol}${subpath}: unexpected feature retention`);
		}
		if(symbol === 'PipeTypeError')
		{
			assert.ok(!Object.keys(chunk.modules).some(id => /node_modules\/@neutrium\/(quantity|decimal)\//.test(id) && chunk.modules[id].renderedLength > 0), 'Errors must exclude Quantity and Decimal');
		}

		// Execute the exact minified bundle; this also catches initialization removed
		// too aggressively by the metadata. There are no external runtime imports.
		const loaded = await import('data:text/javascript;base64,' + Buffer.from(chunk.code).toString('base64'));
		assert.deepEqual(Object.keys(loaded).sort(), (fixture ? [symbol, 'verify'] : [symbol]).sort());
		if(fixture) assert.equal(loaded.verify(), true, `${symbol}${subpath}: bundled behavior failed`);
		results.push({ import: `${symbol} from @neutrium/pipe${subpath}`, bytes: Buffer.byteLength(chunk.code), gzip: gzipSync(chunk.code).length });

		return loaded[symbol];
	}

	for(const subpath of ['', '/pipes'])
	{
		const Pipe = await bundle('Pipe', subpath);
		const pipe = new Pipe('100mm', '5mm');
		assert.equal(pipe.raw('mm').internalDiameter, 90);
		assert.ok(pipe.internalVolume('2m').gt('0m3'));
		assert.throws(() => { pipe.internalDiameter = null; }, TypeError);

		for(const [name, create, diameter, tables] of catalogues)
		{
			const Class = await bundle(name, subpath, [name]);
			const instance = create(Class);
			assert.ok(instance.internalDiameter.eq(diameter), `${name}: wrong bundled geometry`);

			for(const table of tables)
			{
				assertFrozenGraph(Class[table]);
				assert.throws(() => { Class[table] = {}; }, TypeError);
				assert.throws(() => { Class[table].extra = true; }, TypeError);
			}
		}
	}

	for(const subpath of ['', '/validation'])
	{
		const finiteNumber = await bundle('finiteNumber', subpath);
		assert.equal(finiteNumber(3), 3);
		assert.throws(() => finiteNumber(Infinity), error => error instanceof RangeError && error.field === 'value');
	}

	for(const subpath of ['', '/connections'])
	{
		const Port = await bundle('Port', subpath);
		const port = new Port({ internalDiameter: '20mm' });
		assert.ok(port.internalDiameter.eq('20mm'));
		assert.throws(() => { port.internalDiameter = null; }, TypeError);
	}

	const componentModules = ['dist/components/Component.js', 'dist/connections/Port.js'];
	const twoPortModules = [...componentModules, 'dist/components/TwoPortComponent.js'];
	const portSetup = `import { Port } from '@neutrium/pipe/connections'; const port = new Port({ internalDiameter: '20mm' });`;
	const fixtures = [
		{
			symbol: 'Component', subpath: '/components', modules: componentModules,
			source: `${portSetup} export function verify() {
				const component = new Component({ kind: 'custom', ports: { inlet: port }, metadata: { model: 'test' } });
				return component.ports.inlet === port && Object.isFrozen(component.ports) && Object.isFrozen(component.metadata);
			}`,
		},
		{
			symbol: 'TwoPortComponent', subpath: '/components', modules: twoPortModules,
			source: `${portSetup} export function verify() {
				const component = new TwoPortComponent({ kind: 'custom', inlet: port });
				return component.ports.inlet === port && component.ports.outlet === port && Object.isFrozen(component.ports);
			}`,
		},
		{
			symbol: 'Valve', subpath: '/valves', modules: [...twoPortModules, 'dist/valves/Valve.js'],
			source: `${portSetup} export function verify() {
				const valve = new Valve({ valveType: 'ball', inlet: port, boreDiameter: '15mm' });
				return valve.ports.inlet === port && valve.ports.outlet === port && valve.boreDiameter.eq('15mm') &&
					Object.getOwnPropertyDescriptor(valve, 'valveType').writable === false;
			}`,
		},
		{
			symbol: 'Elbow', subpath: '/fittings', modules: [...twoPortModules, 'dist/fittings/Elbow.js'],
			source: `${portSetup} export function verify() {
				const elbow = new Elbow({ port, angle: 45, bendRadius: '30mm' });
				return elbow.angle === 45 && elbow.ports.inlet === port && elbow.bendRadius.eq('30mm') &&
					Object.getOwnPropertyDescriptor(elbow, 'angle').writable === false;
			}`,
		},
		{
			symbol: 'PipeTypeError', subpath: '/errors', modules: [],
			source: `export function verify() {
				const error = new PipeTypeError('Invalid value', { code: 'INVALID_INPUT', field: 'value', value: null });
				return error instanceof TypeError && error.field === 'value' && Object.isFrozen(error.allowedValues) &&
					Object.getOwnPropertyDescriptor(error, 'code').writable === false;
			}`,
		},
	];
	for(const fixture of fixtures)
		for(const subpath of ['', fixture.subpath])
			await bundle(fixture.symbol, subpath, [], fixture);

	console.table(results);
	console.log(`Tree-shaking and bundled initialization checks passed (${results.length} bundles).`);
}

if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
{
	await testTreeShaking();
}
