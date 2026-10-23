# Construction and catalogue benchmarks

Run `npm run benchmark` from the repository checkout. It builds the package and runs `construction.mjs` with exposed garbage collection. The defaults are 1,000 attachments per sample, 20 searches per sample, and five samples. Override these with `BENCH_ITERATIONS` and `BENCH_SAMPLES`; searches use one-fiftieth of the attachment count, with a minimum of five. After building, the script can also be run directly with `node --expose-gc benchmarks/construction.mjs`.

Each case warms up before measurement. These are repeated-use measurements, appropriate for many installed items sharing a physical definition. The custom port contains 100 nested data records to exercise recursive adoption. Results remain live through the sample's memory measurement.

Each JSON output row contains median time per operation, heap growth before explicit collection, and retained heap growth after collection. Heap growth is not total allocated bytes: automatic collection can occur during a sample, and runtime caches and measurement overhead affect the readings. Use the timings for comparisons and the heap values as diagnostics, not fixed memory budgets.

## Recorded comparison

Measured locally on Node.js v26.12.0 using the default workload and five-sample medians, before and after the shared-definition/search optimizations. A search operation returns the entire matching result array; an attachment operation constructs one component.

| Operation | Before (ms/op) | After (ms/op) | Speedup |
|:----------|---------------:|--------------:|--------:|
| Elbow using a shared built-in port | 0.01752 | 0.00219 | 8.0× |
| Tee using a shared custom port | 0.03027 | 0.00173 | 17.4× |
| Adapter using a shared pipe | 0.01658 | 0.00819 | 2.0× |
| Steel search, all results | 15.286 | 14.638 | 1.04× |
| Steel search, minimum bore 800mm | 15.240 | 6.038 | 2.5× |
| PE search, minimum bore 1500mm | 7.193 | 1.701 | 4.2× |

The changes avoid temporary validation ports on repeated attachment, repeated traversal of adopted data, and full pipe geometry for rejected search candidates. They do not promise a smaller final network representation: callers still receive fresh component instances and fresh search results. Weak caches do not keep definitions alive, and cached custom ports reuse the original definition rather than retaining a normalized copy. Results vary with hardware, runtime, catalogue filters and custom data; benchmark representative application inputs as well.

Correctness checks compare searches against full-construction filtering at exact and sub-double-precision thresholds, and verify that accessor-backed definitions, invalid frozen inputs and failed construction cannot bypass validation.
