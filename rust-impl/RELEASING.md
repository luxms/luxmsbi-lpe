# Rust release process

Rust releases come from `rustaple` and use an **`r` prefix**, for example
`r1.8.0`. JavaScript releases from `master` use `v`, for example `v1.8.0`.
Never rename, delete, or reuse an existing release tag during an ordinary
release. A Rust-only follow-up can use a fourth component, such as `r1.8.0.1`.

1. Fetch upstream branches and tags. Merge the chosen stable JS release into
   an isolated Rust compatibility branch. Preserve the JS reference sources;
   submit JS fixes and test improvements in separate PRs to `master`.
2. Implement portable **safe** semantics. Keep explicit JS-only scope
   exclusions narrow and source-linked. Reject `unsafe: true`. Update the
   changelog, API documentation, fixtures, and coverage inventory. The npm
   version follows the merged JS reference; the unpublished native crate's
   internal version is not the GitHub release tag.
3. Run `npm run test:all`, formatting, Clippy, and `npm run test:wasm` using the
   pinned WASI toolchain/runtime. Verify new cases independently against the
   installed stable JS package where possible. Review fixture freshness and
   strict coverage; exclusions never count as Rust passes.
4. Run warmed alternating JS/Rust release benchmarks with
   `BENCH_ITERATIONS=100000 BENCH_REPEATS=9` and `--require-parity`. Record raw
   samples, medians, ranges, revision, compiler, and host. Avoid concurrent
   builds; thermally throttled local measurements are diagnostic. Use the CI
   performance artifact for the published isolated-run comparison.
5. Push the branch and open an English PR targeting `rustaple`. Wait for all
   seven Rust CI jobs, including native/MSRV/macOS/WASI compatibility and
   performance, to pass on the exact reviewed head. Resolve failures before
   merging. Merge only when authorized by the release request.
6. Verify the merged commit and wait for its post-merge CI. Download the tested
   `lpe-wasm32-wasip3` component, native/WASI compatibility reports, and
   performance report from that exact run. Do not substitute a local build.
   Smoke-test the downloaded component, including the new release behavior.
7. Create an annotated `rX.Y.Z` tag at the verified `rustaple` commit and push
   the tag. Publish the GitHub release with English notes identifying the JS
   baseline, Rust PR, merged SHA, CI run, compatibility totals, performance
   measurements, and material scope limits. This does not publish npm or
   crates.io packages.
8. Attach `lpe-wasm32-wasip3.wasm`, compatibility report archives, the benchmark
   report, `release-validation.json`, and `SHA256SUMS`. The validation manifest
   records source/CI revisions, artifact sizes and digests, and smoke results.
   Verify the remote tag target, release body, uploaded sizes, and GitHub asset
   SHA-256 digests against the local manifest. Link the PR and release in the
   completion report.

The CI workflow is `.github/workflows/rust.yml`. Current WASI pins and local
commands are documented in [README.md](README.md#wasi-03). Do not describe a
release as complete while required checks are pending or failed.
