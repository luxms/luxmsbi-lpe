//! Async parity contracts come from src/lisp.js (eager argsAst.map),
//! src/lisp.unbox.js (Promise.all), and src/context/std.js (synchronous try).
//! All pending cases are manually polled: no sleeps, timers, or blocking waits.

use futures::{channel::oneshot, future::FutureExt, task::noop_waker};
use lpe::{Error, EvalOptions, Result, Runtime, Value};
use serde_json::json;
use std::{
    cell::{Cell, RefCell},
    future::Future,
    pin::Pin,
    rc::Rc,
    sync::atomic::Ordering,
    task::{Context, Poll},
};

fn poll_once<F: Future + ?Sized>(future: Pin<&mut F>) -> Poll<F::Output> {
    future.poll(&mut Context::from_waker(&noop_waker()))
}

fn ready_within<F: Future + ?Sized>(mut future: Pin<&mut F>) -> F::Output {
    for _ in 0..8 {
        if let Poll::Ready(value) = poll_once(future.as_mut()) {
            return value;
        }
    }
    panic!("evaluation stayed pending after eight polls; no wall-clock wait was performed")
}

fn pending_global(rt: &mut Runtime, name: &str) -> oneshot::Sender<Result<Value>> {
    let (tx, rx) = oneshot::channel();
    let value = rt.promise(async move { rx.await.expect("test sender remains alive") });
    rt.set_global(name, value);
    tx
}

type Trace = Rc<RefCell<Vec<&'static str>>>;

fn gated_native(
    rt: &mut Runtime,
    name: &'static str,
    trace: Trace,
) -> oneshot::Sender<Result<Value>> {
    let (tx, rx) = oneshot::channel();
    let receiver = RefCell::new(Some(rx));
    rt.register_async(name, move |_| {
        trace.borrow_mut().push(name);
        let rx = receiver.borrow_mut().take().expect("native called once");
        async move { rx.await.expect("test sender remains alive") }.boxed_local()
    });
    tx
}

fn traced_native(rt: &mut Runtime, name: &'static str, result: Value, trace: Trace) {
    rt.register_async(name, move |_| {
        trace.borrow_mut().push(name);
        futures::future::ready(Ok(result.clone())).boxed_local()
    });
}

#[test]
fn pending_global_is_awaited_at_top_level() {
    let mut rt = Runtime::new();
    let tx = pending_global(&mut rt, "pending");
    let ast = json!("pending");
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    tx.send(Ok(Value::Number(42.0))).unwrap();
    assert_eq!(
        ready_within(evaluation.as_mut()).unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn pending_global_arguments_keep_argument_order_not_completion_order() {
    let mut rt = Runtime::new();
    let first = pending_global(&mut rt, "first");
    let second = pending_global(&mut rt, "second");
    let ast = json!(["list", "first", "second"]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    second.send(Ok(Value::Number(2.0))).unwrap();
    assert!(poll_once(evaluation.as_mut()).is_pending());
    first.send(Ok(Value::Number(1.0))).unwrap();
    let value = ready_within(evaluation.as_mut()).unwrap();
    drop(evaluation);
    assert_eq!(
        rt.array_values(&value).unwrap(),
        vec![Value::Number(1.0), Value::Number(2.0)]
    );
}

#[test]
fn repeated_global_promise_is_shared_and_memoized() {
    let mut rt = Runtime::new();
    let executions = Rc::new(Cell::new(0));
    let count = executions.clone();
    let promise = rt.promise(async move {
        count.set(count.get() + 1);
        Ok(Value::Number(21.0))
    });
    rt.set_global("p", promise);
    for _ in 0..2 {
        assert_eq!(
            rt.eval_ast(&json!(["+", "p", "p"]), &EvalOptions::default())
                .unwrap(),
            Value::Number(42.0)
        );
    }
    assert_eq!(executions.get(), 1);
}

#[test]
fn native_returned_promise_is_adopted() {
    let mut rt = Runtime::new();
    let (tx, rx) = oneshot::channel::<Result<Value>>();
    let promise = rt.promise(async move { rx.await.unwrap() });
    rt.register_async("native", move |_| {
        futures::future::ready(Ok(promise.clone())).boxed_local()
    });
    let ast = json!(["native"]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    tx.send(Ok(Value::Number(42.0))).unwrap();
    assert_eq!(
        ready_within(evaluation.as_mut()).unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn host_returned_promise_is_adopted() {
    let mut rt = Runtime::new();
    let (tx, rx) = oneshot::channel::<Result<Value>>();
    let promise = rt.promise(async move { rx.await.unwrap() });
    rt.register_host("host", move |_, _| {
        futures::future::ready(Ok(promise.clone())).boxed_local()
    });
    let ast = json!(["host"]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(
        poll_once(evaluation.as_mut()).is_pending(),
        "eval_async must not expose an unresolved Promise handle"
    );
    tx.send(Ok(Value::Number(42.0))).unwrap();
    assert_eq!(
        ready_within(evaluation.as_mut()).unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn direct_native_siblings_start_before_either_resolves() {
    let mut rt = Runtime::new();
    let trace = Trace::default();
    let first = gated_native(&mut rt, "first", trace.clone());
    let second = gated_native(&mut rt, "second", trace.clone());
    let ast = json!(["+", ["first"], ["second"]]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    assert_eq!(*trace.borrow(), vec!["first", "second"]);
    first.send(Ok(Value::Number(1.0))).unwrap();
    second.send(Ok(Value::Number(2.0))).unwrap();
    assert_eq!(
        ready_within(evaluation.as_mut()).unwrap(),
        Value::Number(3.0)
    );
}

#[test]
fn nested_expression_does_not_block_later_sibling_invocation() {
    let mut rt = Runtime::new();
    let trace = Trace::default();
    let _gate = gated_native(&mut rt, "wait", trace.clone());
    traced_native(&mut rt, "side", Value::Number(2.0), trace.clone());
    let ast = json!(["+", ["identity", ["wait"]], ["side"]]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    // JS EVAL builds the nested Promise and then invokes side synchronously.
    assert_eq!(*trace.borrow(), vec!["wait", "side"]);
}

#[test]
fn nested_pending_global_does_not_block_later_sibling_invocation() {
    let mut rt = Runtime::new();
    let trace = Trace::default();
    let _gate = pending_global(&mut rt, "p");
    traced_native(&mut rt, "side", Value::Number(2.0), trace.clone());
    let ast = json!(["+", ["identity", "p"], ["side"]]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    assert_eq!(*trace.borrow(), vec!["side"]);
}

#[test]
fn independent_dag_branch_runs_as_soon_as_its_own_dependency_resolves() {
    let mut rt = Runtime::new();
    let trace = Trace::default();
    let first = pending_global(&mut rt, "p1");
    let second = pending_global(&mut rt, "p2");
    for name in ["f", "g"] {
        let trace = trace.clone();
        rt.register_async(name, move |args| {
            trace.borrow_mut().push(name);
            futures::future::ready(Ok(args[0].clone())).boxed_local()
        });
    }
    let ast = json!(["+", ["f", "p1"], ["g", "p2"]]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    assert!(trace.borrow().is_empty());

    second.send(Ok(Value::Number(2.0))).unwrap();
    // JS's inner Promise.all([p2]).then(g) progresses independently of p1.
    // The outer addition must remain pending, but g must already have run.
    for _ in 0..8 {
        assert!(poll_once(evaluation.as_mut()).is_pending());
        if !trace.borrow().is_empty() {
            break;
        }
    }
    assert_eq!(
        *trace.borrow(),
        vec!["g"],
        "p1 must not gate the independent g(p2) continuation"
    );

    first.send(Ok(Value::Number(1.0))).unwrap();
    assert_eq!(
        ready_within(evaluation.as_mut()).unwrap(),
        Value::Number(3.0)
    );
    assert_eq!(
        *trace.borrow(),
        vec!["g", "f"],
        "each continuation must run exactly once"
    );
}

#[test]
fn pending_if_argument_starts_sibling_before_condition_and_keeps_branches_lazy() {
    for (condition, branch, result) in [(true, "then", 12.0), (false, "else", 102.0)] {
        let mut rt = Runtime::new();
        let trace = Trace::default();
        let gate = pending_global(&mut rt, "condition");
        traced_native(&mut rt, "then", Value::Number(10.0), trace.clone());
        traced_native(&mut rt, "else", Value::Number(100.0), trace.clone());
        traced_native(&mut rt, "side", Value::Number(2.0), trace.clone());
        let ast = json!(["+", ["if", "condition", ["then"], ["else"]], ["side"]]);
        let options = EvalOptions::default();
        let mut evaluation = Box::pin(rt.eval_async(&ast, &options));

        // JS if returns a Promise without blocking evaluation of outer siblings.
        for _ in 0..8 {
            assert!(poll_once(evaluation.as_mut()).is_pending());
            if !trace.borrow().is_empty() {
                break;
            }
        }
        assert_eq!(
            *trace.borrow(),
            vec!["side"],
            "if must neither block side() nor evaluate a branch before its condition resolves"
        );

        gate.send(Ok(Value::Bool(condition))).unwrap();
        assert_eq!(
            ready_within(evaluation.as_mut()).unwrap(),
            Value::Number(result)
        );
        assert_eq!(
            *trace.borrow(),
            vec!["side", branch],
            "the unselected branch must remain unevaluated"
        );
    }
}

#[test]
fn pending_host_argument_does_not_block_later_sibling_invocation() {
    let mut rt = Runtime::new();
    let trace = Trace::default();
    let (tx, rx) = oneshot::channel::<Result<Value>>();
    let receiver = RefCell::new(Some(rx));
    let host_trace = trace.clone();
    rt.register_host("host", move |_, _| {
        host_trace.borrow_mut().push("host");
        let rx = receiver.borrow_mut().take().unwrap();
        async move { rx.await.expect("test sender remains alive") }.boxed_local()
    });
    traced_native(&mut rt, "side", Value::Number(2.0), trace.clone());
    let ast = json!(["+", ["host"], ["side"]]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    assert_eq!(*trace.borrow(), vec!["host", "side"]);
    drop(evaluation);
    drop(tx);
}

#[test]
fn argument_rejection_does_not_wait_for_an_unrelated_pending_promise() {
    let mut rt = Runtime::new();
    let _pending = pending_global(&mut rt, "pending");
    let rejected = rt.promise(async { Err(Error::new("Error", "fast rejection")) });
    rt.set_global("rejected", rejected);
    let ast = json!(["+", "pending", "rejected"]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    // Promise.all rejects even though its first input never settles.
    let error = ready_within(evaluation.as_mut()).unwrap_err();
    assert_eq!(error.message, "fast rejection");
}

#[test]
fn first_rejection_wins_over_argument_position() {
    let mut rt = Runtime::new();
    let first = pending_global(&mut rt, "first");
    let second = pending_global(&mut rt, "second");
    let ast = json!(["+", "first", "second"]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    second
        .send(Err(Error::new("Error", "second rejected first")))
        .unwrap();
    let early = poll_once(evaluation.as_mut());
    let error = match early {
        Poll::Ready(result) => result.unwrap_err(),
        Poll::Pending => {
            first
                .send(Err(Error::new("Error", "first rejected later")))
                .unwrap();
            ready_within(evaluation.as_mut()).unwrap_err()
        }
    };
    assert_eq!(error.message, "second rejected first");
}

#[test]
fn try_catches_synchronous_throw() {
    let mut rt = Runtime::new();
    assert_eq!(
        rt.eval_ast(
            &json!(["try", ["throw", ["q", "sync"]], "e", "e"]),
            &EvalOptions::default()
        )
        .unwrap(),
        Value::String("sync".into())
    );
}

#[test]
fn try_does_not_catch_rejected_native_promise() {
    let mut rt = Runtime::new();
    rt.register_async("reject", |_| {
        async { Err(Error::new("Error", "async rejection")) }.boxed_local()
    });
    let result = rt.eval_ast(
        &json!(["try", ["reject"], "e", ["q", "caught"]]),
        &EvalOptions::default(),
    );
    // Source std.js returns EVAL's Promise inside try; there is no .catch().
    assert_eq!(result.unwrap_err().message, "async rejection");
}

#[test]
fn try_does_not_catch_rejected_global_promise() {
    let mut rt = Runtime::new();
    let promise = rt.promise(async { Err(Error::new("Error", "global rejection")) });
    rt.set_global("p", promise);
    let result = rt.eval_ast(
        &json!(["try", "p", "e", ["q", "caught"]]),
        &EvalOptions::default(),
    );
    assert_eq!(result.unwrap_err().message, "global rejection");
}

#[test]
fn begin_waits_before_starting_the_next_expression() {
    let mut rt = Runtime::new();
    let trace = Trace::default();
    let gate = gated_native(&mut rt, "wait", trace.clone());
    traced_native(&mut rt, "side", Value::Number(2.0), trace.clone());
    let ast = json!(["begin", ["wait"], ["side"]]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    assert_eq!(*trace.borrow(), vec!["wait"]);
    gate.send(Ok(Value::Number(1.0))).unwrap();
    assert_eq!(
        ready_within(evaluation.as_mut()).unwrap(),
        Value::Number(2.0)
    );
    assert_eq!(*trace.borrow(), vec!["wait", "side"]);
}

struct TrackedPending {
    drops: Rc<Cell<usize>>,
}

impl Future for TrackedPending {
    type Output = Result<Value>;
    fn poll(self: Pin<&mut Self>, _: &mut Context<'_>) -> Poll<Self::Output> {
        Poll::Pending
    }
}

impl Drop for TrackedPending {
    fn drop(&mut self) {
        self.drops.set(self.drops.get() + 1);
    }
}

#[test]
fn dropping_direct_native_evaluation_drops_its_future() {
    let mut rt = Runtime::new();
    let drops = Rc::new(Cell::new(0));
    let track = drops.clone();
    rt.register_async("wait", move |_| {
        TrackedPending {
            drops: track.clone(),
        }
        .boxed_local()
    });
    let ast = json!(["wait"]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    assert_eq!(drops.get(), 0);
    drop(evaluation);
    assert_eq!(drops.get(), 1);
    assert_eq!(
        rt.eval_ast(&json!(42), &options).unwrap(),
        Value::Number(42.0)
    );
}

#[test]
fn dropping_evaluation_preserves_shared_global_until_runtime_drop() {
    let mut rt = Runtime::new();
    let drops = Rc::new(Cell::new(0));
    let pending = rt.promise(TrackedPending {
        drops: drops.clone(),
    });
    rt.set_global("p", pending);
    let options = EvalOptions::default();
    let ast = json!("p");
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    drop(evaluation);
    assert_eq!(drops.get(), 0, "a global Promise may have other consumers");
    rt.collect_garbage(&[]);
    assert_eq!(drops.get(), 0, "global roots must survive collection");
    drop(rt);
    assert_eq!(drops.get(), 1);
}

#[test]
fn dropping_evaluation_allows_collecting_unrooted_argument_future() {
    let mut rt = Runtime::new();
    let drops = Rc::new(Cell::new(0));
    let track = drops.clone();
    rt.register_async("wait", move |_| {
        TrackedPending {
            drops: track.clone(),
        }
        .boxed_local()
    });
    let options = EvalOptions::default();
    let ast = json!(["identity", ["wait"]]);
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    drop(evaluation);
    rt.collect_garbage(&[]);
    assert_eq!(drops.get(), 1);
}

#[test]
fn cancellation_interrupts_a_pending_global_on_repoll() {
    let mut rt = Runtime::new();
    let _gate = pending_global(&mut rt, "p");
    let cancellation = rt.cancellation_token();
    let ast = json!("p");
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    cancellation.store(true, Ordering::Relaxed);
    assert_eq!(
        ready_within(evaluation.as_mut()).unwrap_err().kind,
        "Cancelled"
    );
}

#[test]
fn cancellation_interrupts_pending_argument_join() {
    let mut rt = Runtime::new();
    let _gate = pending_global(&mut rt, "p");
    let cancellation = rt.cancellation_token();
    let ast = json!(["+", "p", 1]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    cancellation.store(true, Ordering::Relaxed);
    assert_eq!(
        ready_within(evaluation.as_mut()).unwrap_err().kind,
        "Cancelled"
    );
}

#[test]
fn cancellation_interrupts_pending_native_and_drops_its_future() {
    let mut rt = Runtime::new();
    let drops = Rc::new(Cell::new(0));
    let track = drops.clone();
    rt.register_async("wait", move |_| {
        TrackedPending {
            drops: track.clone(),
        }
        .boxed_local()
    });
    let cancellation = rt.cancellation_token();
    let ast = json!(["wait"]);
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
    assert!(poll_once(evaluation.as_mut()).is_pending());
    cancellation.store(true, Ordering::Relaxed);
    let outcome = ready_within(evaluation.as_mut());
    drop(evaluation);
    assert_eq!(outcome.unwrap_err().kind, "Cancelled");
    assert_eq!(drops.get(), 1);
}

#[test]
fn rejected_promise_retains_its_payload_through_collection() {
    let mut rt = Runtime::new();
    let payload = rt.array(vec![Value::Number(42.0)]);
    let promise = rt.promise(async move { Err(Error::with_value("Throw", payload)) });
    rt.set_global("p", promise);
    let ast = json!("p");
    let options = EvalOptions::default();
    assert!(rt.eval_ast(&ast, &options).is_err());
    rt.collect_garbage(&[]);
    let error = rt.eval_ast(&ast, &options).unwrap_err();
    let payload = error.value.expect("rejection payload");
    assert_eq!(
        rt.array_values(&payload).unwrap(),
        vec![Value::Number(42.0)]
    );
}
