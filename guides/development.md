# Development and releases

Use Node.js 24 or newer. Install dependencies with `npm ci`, then run `npm test` for the complete test suite. It builds once, checks consumer declarations, runs all Vitest tests, and tests the actual npm archive in an isolated temporary consumer. Use `npm run build` to compile only.

The isolated consumer installs the archive and its dependencies, checks every public JavaScript entry point, compiles the consumer type tests with its own TypeScript installation, and runs all 26 tree-shaking and bundled initialization checks. The compiler uses a standalone configuration without repository path aliases or source-file fallbacks. Temporary files are removed on success or failure. Installation uses npm's cache when available and may need registry access for missing dependencies. Package lifecycle scripts are disabled during packing and installation to avoid rebuilding or recursively running the test suite.

CI uses `npm test -- --archive-output /absolute/path/package.tgz` to save the exact tested archive after all checks pass. The destination directory must already exist.

Run `npm run benchmark` from a repository checkout to measure shared-definition construction and catalogue searches. `BENCH_ITERATIONS` and `BENCH_SAMPLES` control the workload. See [benchmark guide](../benchmarks/README.md) for measurement details and the recorded
before/after comparison.


## Publishing a release

Run `npm ci` to install dependencies and `npm test` to build the library and run the type checks and test suite. Generated `dist/` output is ignored by Git and included in npm packages. `npm pack` builds it automatically.

GitHub Actions runs CI for pull requests and pushes to `main` or `master` on Node.js 24.0.0, 24.x, and 26.x. Each matrix job also installs its packed archive into an isolated consumer and checks runtime imports and TypeScript declarations.

The Node.js 24.x archive is retained only after those checks pass; the release workflow publishes that exact archive without rebuilding it.

To release, update `package.json` and the lockfile,
then push a matching `v<version>` tag. The release workflow runs CI, publishes the verified package to npm, and creates a GitHub release. Prerelease versions use the npm `next` tag; stable versions use `latest`.

Configure an npm trusted publisher for `@neutrium/pipe` pointing to this repository and `.github/workflows/release.yml` before the first automated release.

Before creating a release tag, verify the configuration with an authenticated package maintainer account using `npm trust list @neutrium/pipe --json` (npm 11.15 or newer). The GitHub publisher must name owner `neutrium`, repository `pipe`, workflow file `release.yml`, and allow publishing. This workflow does not use a GitHub environment, so the publisher must not require one. A `401` response means the configuration has not been verified; sign in with `npm login` and retry. See the [npm trusted-publishing documentation](https://docs.npmjs.com/trusted-publishers/).

Commit and push the complete release tree, then require successful CI for that commit on Node.js 24.0.0, 24.x and 26.x before tagging it. Local test results or checks on an earlier commit do not establish that the release commit passes. The tag-triggered release workflow repeats this matrix and gates publishing on its successful completion.

## Building documentation

Run `npm run docs:install` once to install the isolated TypeDoc tools, then `npm run docs` to generate the API reference in `docs/`. Run `npm run docs:check` to validate documentation without generating HTML. The documentation tools use TypeScript 6 independently of the library compiler.

Run `npm run docs:demo` after `npm run docs` to include the interactive demo in `docs/demo/`. The Documentation workflow publishes this site from the default branch. Set the repository's Pages publishing source to **GitHub Actions**.
