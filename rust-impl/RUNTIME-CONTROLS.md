# Opt-in runtime controls

`Runtime::new()` retains the existing behavior. The JS sources, CLI protocol,
WASI defaults, and `EvalOptions` layout are unchanged. A native host can install:

```rust
use lpe::{Error, Result, Runtime, RuntimeControls, RuntimeLimits};
use std::num::NonZeroUsize;

fn configured_runtime(interrupt_pending: fn() -> bool) -> Result<Runtime> {
    let mut rt = Runtime::new();
    rt.set_controls(Some(
        RuntimeControls::new(RuntimeLimits {
            max_work: 1_000_000,
            max_intermediate_bytes: 16 * 1024 * 1024,
            max_depth: 128,
        })
        .with_interrupt_hook(NonZeroUsize::new(256).unwrap(), move || {
            if interrupt_pending() {
                Err(Error::new("Cancelled", "Host interrupt pending"))
            } else {
                Ok(())
            }
        }),
    ))?;
    Ok(rt)
}
```

These values illustrate configuration, not a workload recommendation. Work units
include evaluator ticks, future polls, controlled string conversion, regex
compiler input, regex instructions, backtracking and scan iterations. Work is
not elapsed time, bytes, or the previous evaluator-only step count. A 100k work
budget can reject a moderately large string or a normal production expression;
calibrate with `control_usage()` and representative workloads.

## Scope and errors

- `eval`, `eval_with_options`, `eval_ast`, and `eval_async` establish a fresh
  controlled scope at the outermost evaluation. Source parsing in
  `eval_with_options` still precedes that scope.
- Nested evaluation and argument tasks share the same counters and first error.
  Effective work/depth ceilings are the minimum of installed limits and every
  encountered `EvalOptions` limit. A nested call never resets the counters or
  relaxes a ceiling, even after returning. Limits are absolute per evaluation,
  not an additional allowance for each nested call.
- `set_controls` returns `OptionsError` if called during a controlled evaluation.
  `set_controls(None)` disables controls for subsequent evaluations when idle.
- The first control failure is latched. Work/depth/byte overflow returns
  `Error { kind: "LimitError", .. }`; the token returns `Cancelled`. Hook errors
  are preserved, including message/value. Catching a control error in a host
  callback or LPE `try` does not permit the evaluation to resume successfully.
- Completing, failing, or dropping the top-level future releases its scope.
  A new evaluation resets counters and the latch, not the atomic cancellation
  token. Hosts must clear that token when appropriate. Existing runtime values
  and side effects are not rolled back. Use explicit GC with retained roots.
- Suspended task facades retain their original shared budget, not a newly reset
  one. Direct low-level `eval_in`, `call_value`, stream updates, conversions and
  constructors do not establish new scopes; use a top-level evaluation to apply
  controls. The public `tick` participates when a scope is active.
- `control_usage()` reports current/last work and successfully reserved bytes.
  A rejected reservation is not added and reservations are never refunded.

## Host hook contract

The hook is `Fn() -> lpe::Result<()> + 'static`, stored locally using `Rc`; it
needs neither `Send` nor `Sync`. Use interior mutability for host state. It runs
on the calling evaluator thread, first at evaluation start and then after at
most the configured number of accounted work units. It is not a clock timer.
No threads or signal handlers are installed. A pending future still needs its
host executor to wake/poll it; a blocking host function cannot be interrupted.

The hook must return normally. Do not call an API that panics, throws across C,
longjmps, or unwinds across unsafe FFI. A PostgreSQL adapter can read the pending
query-cancel/process-die flags through its own correctly implemented host hook,
return `Err(Cancelled)`, let the Rust evaluation return, and then invoke
`ProcessInterrupts`/its safe wrapper at the adapter's PostgreSQL error boundary.
The host owns flag access and SQLSTATE/FATAL handling; this crate imports no PG
APIs. Generic interrupt flags may also represent benign events and should not
automatically be treated as cancellation.

## Regex controls

All LPE regex paths (`re_match`, `words`, `update_in`, vararg type selection)
use fallible search when controlled. UTF-16/legacy offsets, captures, sticky and
global behavior are retained. Vendor search hooks execute inside VM dispatch,
backtracking, greedy/lazy single-character loops, unanchored position scans,
lookarounds and long backreference comparisons. An error cannot become a match
or ordinary no-match result, including through a negative assertion.

Controlled patterns are capped at 4096 UTF-16 units. String pattern inputs are
checked before pattern conversion. Compiler input consumption polls the same
host/work controls; callback errors take precedence over syntax errors caused
by stopping that input. The unpolled optimizer is disabled only for controlled
compilation. Quantifiers are represented as loops, not expanded into full
repetitions. Large search text is converted under the cumulative byte/work
budget; literal substring searches also poll during scanning/comparison.

Compiler emission, character-property/set expansion, result capture metadata
construction and some fixed-size engine operations remain unpolled. The pattern
cap reduces exposure but is not a hard compilation time or heap bound. No claim
of bounded wall-clock cancellation latency is made.

The baseline engine also has a known UTF-16 edge case: variable-length
lookbehind such as `(?<=\1(.*))$`, when started inside a surrogate pair, can
underflow an internal capture range. This patch does not change that existing
behavior. UTF-16 differential search tests use code-point-boundary start
positions; UCS-2 tests cover every selected code-unit offset. Direct comparison
tests include ranges and 64-unit chunks splitting surrogate pairs and verify
cursor state after match, mismatch, and insufficient input.

## Allocation accounting

Reservations occur before covered payload construction or growth, with checked
addition/multiplication. They count logical payload bytes, not live memory or
allocator capacity. Several conversions conservatively reserve upper bounds;
copies and intermediate/output buffers may each be charged. Reservations made
before a later failure remain consumed for that evaluation.

Covered paths include:

- Controlled UTF-16 conversion and UTF-8 result construction, including nested
  array-to-string expansion and cycle handling.
- Padding, concatenating string addition, replacement/substitution expansion,
  string split/slice/join, case-conversion payload bounds, regex captures/results.
- List/range/reshape/zip/map/filter result payloads, repeat/mapit/filterit slots
  plus cumulative owned UTF-8/UTF-16 payloads before retaining each result,
  sort merge copies, array/object snapshot cloning through fallible accessors.
- Array length/index expansion and property insertion before mutation, including
  logical sparse-hole entries. Reshape counts repeated owned string payloads.
- Evaluator literal/quoted JSON-to-value payloads and conservative intermediate
  reservations in JSON parsing/stringification.
- Host reservations via `charge_intermediate(bytes)`, called BEFORE allocating
  a host payload. Outside a controlled scope it is a no-op.

This is **not a complete heap bound**. Unaccounted allocations include parser,
AST clones, environment/function/task/arena metadata, hash-table and vector spare
capacity, infallible lookup/get/key/coercion paths and their internal clones,
some collection temporaries, serializer/parser library internals, regex compiled
IR/property sets/capture metadata/backtracking stacks, output logs, host callback
allocations, and already-materialized host inputs. Existing infallible public
constructors (`array`, `object`, `from_json`, etc.) remain trusted host APIs.
The allocator is not replaced; OOM is not converted into an LPE error. Use OS
process/container limits and input-size policies when hard isolation is required.

## Verification commands

```sh
cargo test --locked --offline --manifest-path rust-impl/Cargo.toml
cargo test --locked --offline --manifest-path rust-impl/Cargo.toml -p regress
cargo fmt --manifest-path rust-impl/Cargo.toml -- --check
cargo clippy --locked --offline --manifest-path rust-impl/Cargo.toml --all-targets -- -D warnings
```

`tests/runtime_controls.rs`, the compiler-input unit test, and vendor
`tests/search_control.rs` use deterministic budgets rather than timing races.
PostgreSQL adapter integration and SQLSTATE verification belong to the host.

The combined controls and opt-in legacy-context changes passed 299 core tests
(five pre-existing optional audits ignored), 565 vendor tests (one ignored),
formatting and strict all-target core Clippy on 2026-10-15. A combined regression
checks that legacy assignment loops share the work budget and that recovery
retains the selected undefined-binding semantics. This is dependency evidence,
not an installed PostgreSQL or WASI execution result.
