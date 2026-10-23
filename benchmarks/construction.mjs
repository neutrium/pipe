import { performance } from 'node:perf_hooks';
import { Quantity } from '@neutrium/quantity';
import { Port, Elbow, Tee, PipeComponent, Pipe, ASME_B36_10_Pipe, ISO_11922_Pipe } from '../dist/index.js';

const iterations = Number(process.env.BENCH_ITERATIONS ?? 1000);
const samples = Number(process.env.BENCH_SAMPLES ?? 5);

if(!Number.isSafeInteger(iterations) || iterations < 1 || !Number.isSafeInteger(samples) || samples < 1)
{
	throw new Error('BENCH_ITERATIONS and BENCH_SAMPLES must be positive integers');
}

const port = new Port({ internalDiameter: '100mm', outerDiameter: '110mm' });
const customPort = { internalDiameter: new Quantity('100mm'), details: { rows: Array.from({ length: 100 }, (_, i) => ({ id: i })) } };
const pipe = new Pipe('110mm', '5mm');
const cases = [
	['shared built-in port / elbow', iterations, () => new Elbow({ port })],
	['shared custom port / tee', iterations, () => new Tee({ run: customPort })],
	['shared pipe / adapter', iterations, () => new PipeComponent(pipe)],
	['steel search / all', Math.max(5, Math.floor(iterations / 50)), () => ASME_B36_10_Pipe.find()],
	['steel search / >=800mm', Math.max(5, Math.floor(iterations / 50)), () => ASME_B36_10_Pipe.find({ minimumInternalDiameter: '800mm' })],
	['PE search / >=1500mm', Math.max(5, Math.floor(iterations / 50)), () => ISO_11922_Pipe.find({ minimumInternalDiameter: '1500mm' })],
];
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.log(JSON.stringify({ node: process.version, iterations, samples, gc: Boolean(global.gc) }));

for(const [name, count, run] of cases)
{
	for(let i = 0; i < Math.min(count, 100); i++)
	{
		run();
	}

	const times = [], transient = [], retained = [];

	for(let sample = 0; sample < samples; sample++)
	{
		global.gc?.();
		const before = process.memoryUsage().heapUsed;
		const start = performance.now();
		let results = Array.from({ length: count }, run);
		times.push((performance.now() - start) / count);
		transient.push((process.memoryUsage().heapUsed - before) / count);
		global.gc?.();
		retained.push((process.memoryUsage().heapUsed - before) / count);
		// Retain results until after measurement so construction cannot be eliminated.

		if(results.length !== count)
		{
			throw new Error('Invalid benchmark results');
		}

		results = undefined;
	}

	console.log(JSON.stringify({ name, count, msPerOperation: median(times), heapGrowthBytesPerOperation: median(transient), retainedBytesPerOperation: median(retained) }));
}
