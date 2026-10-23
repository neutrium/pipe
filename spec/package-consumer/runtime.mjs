import assert from 'node:assert/strict';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Quantity } from '@neutrium/quantity';
import * as root from '@neutrium/pipe';
import * as pipes from '@neutrium/pipe/pipes';
import * as connections from '@neutrium/pipe/connections';
import * as components from '@neutrium/pipe/components';
import * as fittings from '@neutrium/pipe/fittings';
import * as valves from '@neutrium/pipe/valves';
import * as validation from '@neutrium/pipe/validation';
import * as errors from '@neutrium/pipe/errors';

const require = createRequire(import.meta.url);
const consumer = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(consumer, 'node_modules/@neutrium/pipe');
// Resolving symlinks proves this test cannot silently use the repository checkout.
assert.equal(realpathSync(packageDirectory), packageDirectory);
const manifestPath = require.resolve('@neutrium/pipe/package.json');
assert.equal(manifestPath, resolve(packageDirectory, 'package.json'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const features = { pipes, connections, components, fittings, valves, validation, errors };
assert.deepEqual(Object.keys(manifest.exports).sort(), ['.', './package.json', ...Object.keys(features).map(name => './' + name)].sort());

for(const [subpath, entry] of Object.entries(manifest.exports))
{
	if(subpath === './package.json') continue;

	for(const target of [entry.types, entry.default])
	{
		assert.equal(typeof target, 'string');
		const installed = resolve(packageDirectory, target);
		const fromPackage = relative(packageDirectory, installed);
		assert.ok(!isAbsolute(fromPackage) && !fromPackage.startsWith('..'), 'Export must be inside the installed package');
		assert.ok(existsSync(installed), 'Missing packed export: ' + target);
	}

	assert.equal(require.resolve('@neutrium/pipe' + (subpath === '.' ? '' : subpath.slice(1))), resolve(packageDirectory, entry.default));
}
for(const feature of Object.values(features))
{
	for(const [name, value] of Object.entries(feature))
	{
		assert.equal(root[name], value);
	}
}

for(const [create, diameter] of [
	[() => new pipes.Pipe('100mm', '5mm'), '90mm'],
	[() => pipes.ASME_B36_10_Pipe.fromDN(100, 40), '102.2604mm'],
	[() => new pipes.ASTM_B88_Tube('1in', 'L'), '1.025in'],
	[() => new pipes.ASTM_B88M_Tube('22mm', 'B'), '19.8mm'],
	[() => new pipes.ISO_11922_Pipe('200mm', '10'), '176.2mm'],
	[() => new pipes.BWG_Tube('1in', '16'), '0.87in'],
])
{
	assert.ok(create().internalDiameter.eq(diameter));
}

const pipe = new pipes.Pipe('100mm', '5mm');
assert.ok(pipe.internalVolume('2m').gt('0m^3'));
assert.equal(pipe.raw('mm').internalDiameter, 90);
const inlet = connections.Port.fromPipe(pipe);
const outlet = new connections.Port({ internalDiameter: '50mm' });
const metadata = { supplier: { names: ['Example'] }, dimension: new Quantity('1mm') };
const custom = new components.Component({ kind: 'custom', ports: { inlet }, metadata });
metadata.supplier.names.push('Changed');
assert.deepEqual(custom.metadata.supplier.names, ['Example']);
assert.ok(Object.isFrozen(custom.metadata.supplier.names));
const twoPort = new components.TwoPortComponent({ kind: 'custom', inlet });
assert.equal(twoPort.ports.inlet, twoPort.ports.outlet);
assert.equal(new pipes.PipeComponent(pipe).pipe, pipe);
assert.equal(new fittings.Elbow({ port: inlet }).angle, 90);
assert.equal(new fittings.Tee({ run: inlet, branch: outlet }).ports.branch, outlet);
assert.equal(new fittings.Reducer({ inlet, outlet }).style, 'concentric');
assert.equal(new valves.Valve({ valveType: 'ball', inlet }).valveType, 'ball');
assert.ok(validation.positiveLength('1in').eq('25.4mm'));
assert.ok(validation.nonNegativeLength('0mm').eq(0));
assert.equal(validation.finiteNumber(0.5), 0.5);
assert.ok(validation.lengthQuantity('20mm').eq('2cm'));
assert.ok(validation.densityQuantity('1000kg/m^3').gt(0));
assert.throws(() => new connections.Port({ internalDiameter: '1kg' }), error => errors.isPipeError(error) && error instanceof errors.PipeTypeError);

for(const subpath of ['dist/index.js', 'src/index.ts', 'dist/internal/readonly.js'])
{
	assert.throws(() => require.resolve('@neutrium/pipe/' + subpath), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
}

console.log('All installed public entry points and representative behaviors passed.');
