import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as root from '@neutrium/pipe';
import * as pipes from '@neutrium/pipe/pipes';
import * as connections from '@neutrium/pipe/connections';
import * as components from '@neutrium/pipe/components';
import * as fittings from '@neutrium/pipe/fittings';
import * as valves from '@neutrium/pipe/valves';
import * as validation from '@neutrium/pipe/validation';
import * as errors from '@neutrium/pipe/errors';

const require = createRequire(import.meta.url);
const manifestPath = require.resolve('@neutrium/pipe/package.json');
const manifestURL = pathToFileURL(manifestPath);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const features = { pipes, connections, components, fittings, valves, validation, errors };

describe('Public package surfaces', () => {
	it.each(Object.entries(features))('exports the same %s implementations from its feature and root', (_name, feature) => {
		for(const [name, value] of Object.entries(feature)) expect(root[name]).toBe(value);
	});

	it('makes the root exactly the union of the supported feature surfaces', () => {
		const names = new Set(Object.values(features).flatMap(feature => Object.keys(feature)));
		expect(Object.keys(root).sort()).toEqual([...names].sort());
	});

	it('ships JavaScript and declarations for every documented entry point', () => {
		expect(Object.keys(manifest.exports).sort()).toEqual([
			'.', ...Object.keys(features).map(name => './' + name), './package.json',
		].sort());
		for(const [subpath, entry] of Object.entries(manifest.exports)) {
			if(subpath === './package.json') continue;
			for(const target of [entry.types, entry.default]) {
				expect(typeof target).toBe('string');
				expect(existsSync(new URL(target, manifestURL))).toBe(true);
			}
			const specifier = '@neutrium/pipe' + (subpath === '.' ? '' : subpath.slice(1));
			expect(require.resolve(specifier)).toBe(fileURLToPath(new URL(entry.default, manifestURL)));
		}
	});

	it('keeps the validation entry point limited to public validation helpers', () => {
		expect(Object.keys(validation).sort()).toEqual([
			'densityQuantity', 'finiteNumber', 'lengthQuantity', 'nonNegativeLength', 'positiveLength',
		]);
	});

	it.each([
		'src/index.ts', 'dist/index.js', 'dist/internal/readonly.js',
		'dist/pipes/catalogue.js', 'internal/tableKeys', 'fittings/Elbow', 'valves/Valve.js',
	])('rejects implementation deep imports: %s', path => {
		expect(() => require.resolve('@neutrium/pipe/' + path))
			.toThrow(expect.objectContaining({ code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }));
	});

	it('allows errors from focused imports to be caught using either entry point', () => {
		try {
			new connections.Port({ internalDiameter: '1kg' });
			throw new Error('Expected invalid dimension');
		} catch(error) {
			expect(error).toBeInstanceOf(errors.PipeTypeError);
			expect(error).toBeInstanceOf(root.PipeTypeError);
			expect(errors.isPipeError(error)).toBe(true);
		}
	});
});
