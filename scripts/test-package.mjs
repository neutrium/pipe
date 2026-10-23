import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { testTreeShaking } from './test-tree-shaking.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const compiler = JSON.parse(readFileSync(require.resolve('typescript/package.json'), 'utf8'));
const typeTests = JSON.parse(readFileSync(join(root, 'tsconfig.type-tests.json'), 'utf8')).files;
const args = process.argv.slice(2);

if(args.length !== 0 && (args.length !== 2 || args[0] !== '--archive-output' || !args[1].trim()))
{
	throw new Error('Usage: npm test -- [--archive-output /absolute/path/package.tgz]');
}
const archiveOutput = args.length ? resolve(args[1]) : undefined;

// npm run provides its CLI path on all platforms; do not depend on a shell or
// resolve dependencies through the repository's node_modules or NODE_PATH.
const environment = { ...process.env };
delete environment.NODE_PATH;

function npm(args, cwd, capture = false)
{
	const executable = process.env.npm_execpath;
	return execFileSync(executable ? process.execPath : 'npm', executable ? [executable, ...args] : args, {
		cwd, env: environment, encoding: 'utf8', stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'],
	});
}

const temporary = mkdtempSync(join(tmpdir(), 'neutrium-pipe-consumer-'));
try
{
	console.log('Packing the existing build (lifecycle scripts disabled).');
	const packed = JSON.parse(npm(['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], root, true));
	const archive = join(temporary, basename(packed[0].filename));

	console.log('Installing archive into an isolated consumer:', archive);
	writeFileSync(join(temporary, 'package.json'), JSON.stringify({
		name: 'neutrium-pipe-package-consumer', private: true, type: 'module',
		dependencies: {
			[manifest.name]: 'file:' + archive,
			'@neutrium/quantity': manifest.dependencies['@neutrium/quantity'],
		},
		devDependencies: { typescript: compiler.version },
	}, null, 2));
	npm(['install', '--ignore-scripts', '--include=dev', '--no-audit', '--no-fund', '--prefer-offline'], temporary);

	copyFileSync(join(root, 'spec/package-consumer/runtime.mjs'), join(temporary, 'runtime.mjs'));
	console.log('Checking installed JavaScript entry points and behavior.');
	execFileSync(process.execPath, ['runtime.mjs'], { cwd: temporary, env: environment, stdio: 'inherit' });

	const files = typeTests.map(file => {
		const name = basename(file);
		copyFileSync(join(root, file), join(temporary, name));
		return name;
	});
	// Standalone configuration: no repository extends, paths, baseUrl or symlinks.
	writeFileSync(join(temporary, 'tsconfig.json'), JSON.stringify({
		compilerOptions: {
			module: 'Node16', moduleResolution: 'Node16', target: 'ES2022',
			strict: true, noUncheckedIndexedAccess: true, noEmit: true, skipLibCheck: false, types: [],
		},
		files,
	}, null, 2));
	console.log('Checking installed declarations with the consumer TypeScript compiler.');
	execFileSync(process.execPath, [join(temporary, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], {
		cwd: temporary, env: environment, stdio: 'inherit',
	});
	console.log('Checking tree shaking and initialization from the installed archive.');
	await testTreeShaking(temporary);
	console.log('Packed consumer checks passed.');

	if(archiveOutput)
	{
		copyFileSync(archive, archiveOutput);
		console.log('Verified package saved to:', archiveOutput);
	}
}
finally
{
	// This directory was created by this invocation. CI retains a copy of the
	// exact verified archive outside it for publication, only after all checks pass.
	rmSync(temporary, { recursive: true, force: true });
}
