//! Like JS, any Stream operand selects shallow unboxing: Promise operands reach
//! the resolver unchanged, and settlement alone does not emit. Returned Promises
//! and nested child payloads also stay shallow. Opt-in JS audits compare mixed
//! expressions and returned payload identities/ownership. Bounded polling catches
//! unintended waits; expression tests create their source Stream before evaluation.

use futures::{channel::oneshot, future, task::noop_waker, FutureExt};
use lpe::{Error, EvalOptions, Result, Runtime, StreamContext, Value};
use serde_json::{json, Value as Json};
use std::{
    cell::{Cell, RefCell},
    future::Future,
    pin::Pin,
    rc::{Rc, Weak},
    task::{Context, Poll},
};

fn n(value: i32) -> Value {
    Value::Number(value as f64)
}

fn poll_once<F: Future + ?Sized>(future: Pin<&mut F>) -> Poll<F::Output> {
    future.poll(&mut Context::from_waker(&noop_waker()))
}

fn ready<F: Future>(future: F) -> F::Output {
    let mut future = Box::pin(future);
    for _ in 0..8 {
        if let Poll::Ready(value) = poll_once(future.as_mut()) {
            return value;
        }
    }
    panic!("unexpected wait at a stream/Promise boundary after eight polls")
}

fn context(rt: &Runtime) -> StreamContext {
    StreamContext::new(rt.global_env(), &EvalOptions::default())
}

fn eval_ready(rt: &mut Runtime, source: &str) -> Value {
    ready(rt.eval_async(&lpe::parse(source).unwrap(), &EvalOptions::default())).unwrap()
}

fn promise_gate(rt: &mut Runtime) -> (Value, oneshot::Sender<Result<Value>>) {
    let (tx, rx) = oneshot::channel();
    let promise = rt.promise(async move { rx.await.expect("test sender remains alive") });
    (promise, tx)
}

fn tracked_pending(rt: &mut Runtime) -> (Value, Weak<()>) {
    let marker = Rc::new(());
    let weak = Rc::downgrade(&marker);
    let promise = rt.promise(async move {
        let result = future::pending::<Result<Value>>().await;
        drop(marker);
        result
    });
    (promise, weak)
}

fn observe(rt: &mut Runtime, stream: &Value) -> Rc<RefCell<Vec<Value>>> {
    let events = Rc::new(RefCell::new(vec![]));
    let captured = events.clone();
    rt.stream_subscribe(stream, move |value| captured.borrow_mut().push(value))
        .unwrap();
    events
}

fn assert_detached(rt: &Runtime, stream: &Value) {
    let stats = rt.stream_stats(stream).unwrap();
    assert_eq!(stats.references, 1);
    assert_eq!(stats.listeners, 0);
    assert!(!stats.disposed);
}

#[test]
fn stream_unbox_passes_raw_promise_operands_immediately_to_resolver() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let (promise, tx) = promise_gate(&mut rt);
    let snapshots = Rc::new(RefCell::new(vec![]));
    let captured = snapshots.clone();
    let context = context(&rt);
    let result = ready(rt.unbox(
        vec![source.clone(), promise.clone()],
        context,
        Rc::new(move |_, values, _, _| {
            captured.borrow_mut().push(values.clone());
            future::ready(Ok(values[1].clone())).boxed_local()
        }),
    ))
    .unwrap();
    let first = rt.stream_value(&result).unwrap();
    assert!(matches!(first, Value::Promise(_)));
    assert_eq!(first, promise);
    assert_eq!(*snapshots.borrow(), vec![vec![n(1), promise.clone()]]);
    let events = observe(&mut rt, &result);
    ready(rt.stream_next_async(&source, n(2))).unwrap();
    let second = rt.stream_value(&result).unwrap();
    assert!(matches!(second, Value::Promise(_)));
    assert_eq!(first, second);
    assert_eq!(*events.borrow(), vec![second.clone()]);
    let mut resolution = Box::pin(rt.resolve_value(second.clone()));
    assert!(poll_once(resolution.as_mut()).is_pending());
    let expected = vec![vec![n(1), promise.clone()], vec![n(2), promise.clone()]];
    assert_eq!(*snapshots.borrow(), expected);
    drop(resolution);

    tx.send(Ok(n(9))).unwrap();
    assert_eq!(ready(rt.resolve_value(second.clone())).unwrap(), n(9));
    assert_eq!(ready(rt.resolve_value(first)).unwrap(), n(9));
    assert_eq!(*snapshots.borrow(), expected);
    assert_eq!(rt.stream_value(&result).unwrap(), second);
    assert_eq!(*events.borrow(), vec![second.clone()]);
    ready(rt.stream_next_async(&source, n(3))).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), promise);
    assert_eq!(snapshots.borrow()[2], vec![n(3), promise]);
    assert_eq!(*events.borrow(), vec![second.clone(), second]);
    rt.stream_release(&result).unwrap();
    assert_detached(&rt, &source);
}

#[test]
fn evaluator_preserves_raw_mixed_global_operands_in_both_orders_and_snapshots() {
    for promise_first in [false, true] {
        let mut rt = Runtime::new();
        let source = rt.create_stream(n(1));
        let (promise, tx) = promise_gate(&mut rt);
        rt.set_global("s", source.clone());
        rt.set_global("p", promise.clone());
        let expression = if promise_first {
            "list(p, s)"
        } else {
            "list(s, p)"
        };
        let result = eval_ready(&mut rt, expression);
        let first = rt.stream_value(&result).unwrap();
        let expected = |value| {
            if promise_first {
                vec![promise.clone(), n(value)]
            } else {
                vec![n(value), promise.clone()]
            }
        };
        assert_eq!(rt.array_values(&first).unwrap(), expected(1));
        let events = observe(&mut rt, &result);
        ready(rt.stream_next_async(&source, n(2))).unwrap();
        let second = rt.stream_value(&result).unwrap();
        assert_eq!(rt.array_values(&second).unwrap(), expected(2));
        assert_ne!(first, second);
        tx.send(Ok(n(9))).unwrap();
        assert_eq!(ready(rt.resolve_value(promise.clone())).unwrap(), n(9));
        assert_eq!(rt.array_values(&first).unwrap(), expected(1));
        assert_eq!(rt.array_values(&second).unwrap(), expected(2));
        assert_eq!(rt.stream_value(&result).unwrap(), second);
        assert_eq!(*events.borrow(), vec![second.clone()]);
        ready(rt.stream_next_async(&source, n(3))).unwrap();
        let third = rt.stream_value(&result).unwrap();
        assert_eq!(rt.array_values(&third).unwrap(), expected(3));
        assert_eq!(*events.borrow(), vec![second, third]);
        rt.stream_release(&result).unwrap();
        assert_detached(&rt, &source);
    }
}

#[test]
fn evaluator_passes_pending_native_arguments_raw_without_reinvoking_them() {
    for native_first in [false, true] {
        let mut rt = Runtime::new();
        let source = rt.create_stream(n(1));
        rt.set_global("s", source.clone());
        let (tx, rx) = oneshot::channel::<Result<Value>>();
        let receiver = RefCell::new(Some(rx));
        let calls = Rc::new(Cell::new(0));
        let captured = calls.clone();
        rt.register_async("fetch", move |_| {
            captured.set(captured.get() + 1);
            let rx = receiver.borrow_mut().take().expect("fetch called once");
            async move { rx.await.expect("test sender remains alive") }.boxed_local()
        });
        let expression = if native_first {
            "list(fetch(), s)"
        } else {
            "list(s, fetch())"
        };
        let result = eval_ready(&mut rt, expression);
        let first = rt.stream_value(&result).unwrap();
        let first_values = rt.array_values(&first).unwrap();
        let promise = first_values[if native_first { 0 } else { 1 }].clone();
        assert!(matches!(promise, Value::Promise(_)));
        let expected = |value| {
            if native_first {
                vec![promise.clone(), n(value)]
            } else {
                vec![n(value), promise.clone()]
            }
        };
        assert_eq!(first_values, expected(1));
        let mut resolution = Box::pin(rt.resolve_value(promise.clone()));
        assert!(poll_once(resolution.as_mut()).is_pending());
        drop(resolution);
        let events = observe(&mut rt, &result);
        ready(rt.stream_next_async(&source, n(2))).unwrap();
        let second = rt.stream_value(&result).unwrap();
        assert_eq!(rt.array_values(&second).unwrap(), expected(2));
        assert_ne!(first, second);
        assert_eq!(calls.get(), 1);
        tx.send(Ok(n(9))).unwrap();
        assert_eq!(ready(rt.resolve_value(promise.clone())).unwrap(), n(9));
        assert_eq!(rt.array_values(&first).unwrap(), expected(1));
        assert_eq!(rt.array_values(&second).unwrap(), expected(2));
        assert_eq!(calls.get(), 1);
        assert_eq!(rt.stream_value(&result).unwrap(), second);
        assert_eq!(*events.borrow(), vec![second.clone()]);
        ready(rt.stream_next_async(&source, n(3))).unwrap();
        let third = rt.stream_value(&result).unwrap();
        assert_eq!(rt.array_values(&third).unwrap(), expected(3));
        assert_eq!(*events.borrow(), vec![second, third]);
        assert_eq!(calls.get(), 1);
        rt.stream_release(&result).unwrap();
        assert_detached(&rt, &source);
    }
}

#[test]
fn stream_plus_promise_coerces_raw_operands_in_both_orders_regardless_of_settlement() {
    for promise_first in [false, true] {
        for state in [
            "pending",
            "fulfilled_before",
            "rejected_before",
            "fulfilled_after",
            "rejected_after",
        ] {
            let mut rt = Runtime::new();
            let source = rt.create_stream(n(2));
            let (operand, tx) = promise_gate(&mut rt);
            let mut tx = Some(tx);
            let reject = state.starts_with("rejected");
            let outcome = || {
                if reject {
                    Err(Error::new("OperandFailure", "promise operand rejected"))
                } else {
                    Ok(n(40))
                }
            };
            if state.ends_with("before") {
                tx.take().unwrap().send(outcome()).unwrap();
                assert_eq!(ready(rt.resolve_value(operand.clone())).is_err(), reject);
            }
            let returned_stream = source.clone();
            rt.register("stream", move |_| Ok(returned_stream.clone()));
            let returned_promise = operand.clone();
            rt.register("promise", move |_| Ok(returned_promise.clone()));

            let expression = if promise_first {
                "promise() + stream()"
            } else {
                "stream() + promise()"
            };
            let expected = |value| {
                Value::String(if promise_first {
                    format!("[object Promise]{value}")
                } else {
                    format!("{value}[object Promise]")
                })
            };
            let result = eval_ready(&mut rt, expression);
            assert!(matches!(result, Value::Stream(_)));
            let first = rt.stream_value(&result).unwrap();
            assert_eq!(first, expected(2), "{expression}: {state}");
            let events = observe(&mut rt, &result);
            ready(rt.stream_next_async(&source, n(4))).unwrap();
            let second = rt.stream_value(&result).unwrap();
            assert_eq!(second, expected(4), "{expression}: {state}");
            if !state.ends_with("before") {
                let mut resolution = Box::pin(rt.resolve_value(operand.clone()));
                assert!(poll_once(resolution.as_mut()).is_pending());
                drop(resolution);
            }
            if state.ends_with("after") {
                tx.take().unwrap().send(outcome()).unwrap();
                let resolved = ready(rt.resolve_value(operand.clone()));
                if reject {
                    assert_eq!(resolved.unwrap_err().message, "promise operand rejected");
                } else {
                    assert_eq!(resolved.unwrap(), n(40));
                }
            }
            assert_eq!(rt.stream_value(&result).unwrap(), second);
            assert_eq!(*events.borrow(), vec![second.clone()]);
            ready(rt.stream_next_async(&source, n(6))).unwrap();
            let third = rt.stream_value(&result).unwrap();
            assert_eq!(third, expected(6), "{expression}: {state}");
            assert_eq!(*events.borrow(), vec![second, third]);
            rt.stream_release(&result).unwrap();
            assert_detached(&rt, &source);
        }
    }
}

#[test]
fn rejected_mixed_operand_remains_raw_and_does_not_skip_resolver() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let (operand, tx) = promise_gate(&mut rt);
    let calls = Rc::new(Cell::new(0));
    let captured = calls.clone();
    let context = context(&rt);
    let output = ready(rt.unbox(
        vec![source.clone(), operand.clone()],
        context,
        Rc::new(move |_, values, _, _| {
            captured.set(captured.get() + 1);
            assert!(matches!(values[1], Value::Promise(_)));
            future::ready(Ok(values[0].clone())).boxed_local()
        }),
    ))
    .unwrap();
    let snapshot = rt.stream_value(&output).unwrap();
    assert_eq!(snapshot, n(1));
    assert_eq!(calls.get(), 1);
    let events = observe(&mut rt, &output);
    ready(rt.stream_next_async(&source, n(2))).unwrap();
    assert_eq!(calls.get(), 2);
    tx.send(Err(Error::new("OperandFailure", "mixed operand rejected")))
        .unwrap();
    assert_eq!(
        ready(rt.resolve_value(operand)).unwrap_err().message,
        "mixed operand rejected"
    );
    assert_eq!(calls.get(), 2);
    assert_eq!(rt.stream_value(&output).unwrap(), n(2));
    assert_eq!(*events.borrow(), vec![n(2)]);
    ready(rt.stream_next_async(&source, n(3))).unwrap();
    assert_eq!(calls.get(), 3);
    assert_eq!(rt.stream_value(&output).unwrap(), n(3));
    assert_eq!(*events.borrow(), vec![n(2), n(3)]);
    rt.stream_release(&output).unwrap();
    assert_detached(&rt, &source);
}

#[test]
fn release_and_runtime_drop_reclaim_pending_mixed_operands_and_resolver_captures() {
    for release in [false, true] {
        let mut rt = Runtime::new();
        let source = rt.create_stream(n(1));
        let baseline = rt.live_allocations();
        let (operand, operand_marker) = tracked_pending(&mut rt);
        let marker = Rc::new(());
        let weak = Rc::downgrade(&marker);
        let context = context(&rt);
        let output = ready(rt.unbox(
            vec![source.clone(), operand.clone()],
            context,
            Rc::new(move |_, values, _, _| {
                let marker = marker.clone();
                async move {
                    drop(marker);
                    Ok(values[1].clone())
                }
                .boxed_local()
            }),
        ))
        .unwrap();
        let snapshot = rt.stream_value(&output).unwrap();
        assert_eq!(snapshot, operand);
        let mut resolution = Box::pin(rt.resolve_value(snapshot));
        assert!(poll_once(resolution.as_mut()).is_pending());
        drop(resolution);
        assert!(operand_marker.upgrade().is_some());
        assert!(weak.upgrade().is_some());
        if release {
            rt.stream_release(&output).unwrap();
            assert_detached(&rt, &source);
            assert!(weak.upgrade().is_none(), "release must drop the resolver");
            rt.collect_garbage(&[source.clone(), output]);
            assert!(
                operand_marker.upgrade().is_some(),
                "rooted output owns its raw Promise payload"
            );
            rt.collect_garbage(std::slice::from_ref(&source));
            assert!(operand_marker.upgrade().is_none());
            assert_eq!(rt.live_allocations(), baseline);
        }
        drop(rt);
        assert!(operand_marker.upgrade().is_none());
        assert!(
            weak.upgrade().is_none(),
            "mixed resolver retained its owning Runtime"
        );
    }
}

#[test]
fn immediately_ready_async_success_and_rejection_stay_promise_valued() {
    for reject in [false, true] {
        let mut rt = Runtime::new();
        let source = rt.create_stream(n(1));
        rt.set_global("s", source.clone());
        rt.register_async("fetch", move |values| {
            let result = if reject {
                Err(Error::new("AsyncFailure", "ready rejection"))
            } else {
                Ok(values[0].clone())
            };
            future::ready(result).boxed_local()
        });
        let result = eval_ready(&mut rt, "fetch(s)");
        let first = rt.stream_value(&result).unwrap();
        assert!(matches!(first, Value::Promise(_)));
        let events = observe(&mut rt, &result);
        let resolved = ready(rt.resolve_value(first.clone()));
        if reject {
            assert_eq!(resolved.unwrap_err().message, "ready rejection");
        } else {
            assert_eq!(resolved.unwrap(), n(1));
        }
        assert_eq!(rt.stream_value(&result).unwrap(), first);
        assert!(events.borrow().is_empty());
        ready(rt.stream_next_async(&source, n(2))).unwrap();
        let second = rt.stream_value(&result).unwrap();
        assert!(matches!(second, Value::Promise(_)));
        assert_ne!(first, second);
        assert_eq!(*events.borrow(), vec![second]);
        rt.stream_release(&result).unwrap();
        assert_detached(&rt, &source);
    }
}

#[test]
fn pending_native_results_do_not_block_updates_or_emit_on_late_settlement() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    rt.set_global("s", source.clone());
    let senders = Rc::new(RefCell::new(vec![]));
    let captured = senders.clone();
    rt.register_async("fetch", move |_| {
        let (tx, rx) = oneshot::channel::<Result<Value>>();
        captured.borrow_mut().push(tx);
        async move { rx.await.expect("test sender remains alive") }.boxed_local()
    });
    let result = eval_ready(&mut rt, "fetch(s)");
    let first = rt.stream_value(&result).unwrap();
    let events = observe(&mut rt, &result);
    ready(rt.stream_next_async(&source, n(2))).unwrap();
    let second = rt.stream_value(&result).unwrap();
    ready(rt.stream_next_async(&source, n(3))).unwrap();
    let third = rt.stream_value(&result).unwrap();
    for value in [&first, &second, &third] {
        assert!(matches!(value, Value::Promise(_)));
    }
    assert_ne!(first, second);
    assert_ne!(second, third);
    let expected = vec![second.clone(), third.clone()];
    assert_eq!(*events.borrow(), expected);
    let mut senders = std::mem::take(&mut *senders.borrow_mut());
    assert_eq!(senders.len(), 3);

    senders.pop().unwrap().send(Ok(n(30))).unwrap();
    assert_eq!(ready(rt.resolve_value(third.clone())).unwrap(), n(30));
    senders.remove(0).send(Ok(n(10))).unwrap();
    assert_eq!(ready(rt.resolve_value(first)).unwrap(), n(10));
    senders
        .pop()
        .unwrap()
        .send(Err(Error::new("AsyncFailure", "late rejection")))
        .unwrap();
    assert_eq!(
        ready(rt.resolve_value(second)).unwrap_err().message,
        "late rejection"
    );
    assert_eq!(rt.stream_value(&result).unwrap(), third);
    assert_eq!(*events.borrow(), expected);
    rt.stream_release(&result).unwrap();
    assert_detached(&rt, &source);
}

#[test]
fn already_settled_promises_remain_raw_stream_payloads() {
    for reject in [false, true] {
        let mut rt = Runtime::new();
        let source = rt.create_stream(n(1));
        let outcome = if reject {
            Err(Error::new("AsyncFailure", "settled rejection"))
        } else {
            Ok(n(9))
        };
        let promise = rt.promise(future::ready(outcome));
        let settled = ready(rt.resolve_value(promise.clone()));
        assert_eq!(settled.is_err(), reject);
        let captured = promise.clone();
        let context = context(&rt).with_values(vec![promise.clone()]);
        let result = ready(rt.unbox(
            vec![source.clone()],
            context,
            Rc::new(move |_, _, _, _| future::ready(Ok(captured.clone())).boxed_local()),
        ))
        .unwrap();
        assert_eq!(rt.stream_value(&result).unwrap(), promise);
        let events = observe(&mut rt, &result);
        ready(rt.stream_next_async(&source, n(2))).unwrap();
        assert_eq!(rt.stream_value(&result).unwrap(), promise);
        assert_eq!(*events.borrow(), vec![promise]);
        rt.stream_release(&result).unwrap();
        assert_detached(&rt, &source);
    }
}

#[test]
fn branch_switch_to_pending_promise_detaches_child_immediately() {
    let mut rt = Runtime::new();
    let flag = rt.create_stream(Value::Bool(true));
    let child = rt.create_stream(n(7));
    let (promise, tx) = promise_gate(&mut rt);
    rt.set_global("flag", flag.clone());
    rt.set_global("child", child.clone());
    rt.set_global("p", promise.clone());
    let result = eval_ready(&mut rt, "if(flag, child, p)");
    assert_eq!(rt.stream_value(&result).unwrap(), n(7));
    assert_eq!(rt.stream_stats(&child).unwrap().references, 2);
    assert_eq!(rt.stream_stats(&child).unwrap().listeners, 1);
    let events = observe(&mut rt, &result);
    ready(rt.stream_next_async(&flag, Value::Bool(false))).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), promise);
    assert_detached(&rt, &child);
    rt.stream_next(&child, n(8)).unwrap();
    assert_eq!(*events.borrow(), vec![promise.clone()]);
    ready(rt.stream_next_async(&flag, Value::Bool(true))).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(8));

    tx.send(Ok(n(99))).unwrap();
    assert_eq!(ready(rt.resolve_value(promise.clone())).unwrap(), n(99));
    assert_eq!(rt.stream_value(&result).unwrap(), n(8));
    assert_eq!(*events.borrow(), vec![promise, n(8)]);
    rt.stream_release(&result).unwrap();
    assert_detached(&rt, &child);
    assert_detached(&rt, &flag);
}

#[test]
fn released_output_is_not_revived_by_promise_settlement() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let (promise, tx) = promise_gate(&mut rt);
    let captured = promise.clone();
    let context = context(&rt).with_values(vec![promise.clone()]);
    let result = ready(rt.unbox(
        vec![source.clone()],
        context,
        Rc::new(move |_, _, _, _| future::ready(Ok(captured.clone())).boxed_local()),
    ))
    .unwrap();
    let events = observe(&mut rt, &result);
    rt.stream_release(&result).unwrap();
    assert_detached(&rt, &source);
    tx.send(Ok(n(9))).unwrap();
    assert_eq!(ready(rt.resolve_value(promise.clone())).unwrap(), n(9));
    assert!(rt.stream_stats(&result).unwrap().disposed);
    assert_eq!(rt.stream_value(&result).unwrap(), promise);
    assert!(events.borrow().is_empty());
}

#[test]
fn promise_only_unbox_is_deferred_orders_arguments_and_adopts_returned_promise() {
    let mut rt = Runtime::new();
    let _mode = rt.create_stream(Value::Undefined);
    let (first, first_tx) = promise_gate(&mut rt);
    let (second, second_tx) = promise_gate(&mut rt);
    let snapshots = Rc::new(RefCell::new(vec![]));
    let captured = snapshots.clone();
    let context = context(&rt);
    let result = ready(rt.unbox(
        vec![first, n(10), second],
        context,
        Rc::new(move |rt, values, _, _| {
            captured.borrow_mut().push(values.clone());
            let total = values.iter().map(|v| rt.to_number(v)).sum();
            let promise = rt.promise(future::ready(Ok(Value::Number(total))));
            future::ready(Ok(promise)).boxed_local()
        }),
    ))
    .unwrap();
    assert!(matches!(result, Value::Promise(_)));
    assert!(snapshots.borrow().is_empty());
    let mut resolution = Box::pin(rt.resolve_value(result));
    assert!(poll_once(resolution.as_mut()).is_pending());
    second_tx.send(Ok(n(2))).unwrap();
    assert!(poll_once(resolution.as_mut()).is_pending());
    assert!(snapshots.borrow().is_empty());
    first_tx.send(Ok(n(1))).unwrap();
    assert_eq!(ready(resolution.as_mut()).unwrap(), n(13));
    assert_eq!(*snapshots.borrow(), vec![vec![n(1), n(10), n(2)]]);
}

#[test]
fn promise_only_rejection_skips_resolver_despite_another_pending_argument() {
    let mut rt = Runtime::new();
    let _mode = rt.create_stream(Value::Undefined);
    let never = rt.promise(future::pending());
    let (rejected, tx) = promise_gate(&mut rt);
    let calls = Rc::new(Cell::new(0));
    let captured = calls.clone();
    let context = context(&rt);
    let result = ready(rt.unbox(
        vec![never, rejected],
        context,
        Rc::new(move |_, _, _, _| {
            captured.set(captured.get() + 1);
            future::ready(Ok(n(0))).boxed_local()
        }),
    ))
    .unwrap();
    assert!(matches!(result, Value::Promise(_)));
    let mut resolution = Box::pin(rt.resolve_value(result));
    assert!(poll_once(resolution.as_mut()).is_pending());
    tx.send(Err(Error::new("AsyncFailure", "argument rejection")))
        .unwrap();
    assert_eq!(
        ready(resolution.as_mut()).unwrap_err().message,
        "argument rejection"
    );
    assert_eq!(calls.get(), 0);
}

#[test]
fn promise_resolving_to_stream_does_not_trigger_second_stream_detection() {
    let mut rt = Runtime::new();
    let child = rt.create_stream(n(7));
    let promise = rt.promise(future::ready(Ok(child.clone())));
    let snapshots = Rc::new(RefCell::new(vec![]));
    let captured = snapshots.clone();
    let context = context(&rt);
    let result = ready(rt.unbox(
        vec![promise],
        context,
        Rc::new(move |_, values, _, _| {
            captured.borrow_mut().push(values.clone());
            future::ready(Ok(values[0].clone())).boxed_local()
        }),
    ))
    .unwrap();
    assert!(matches!(result, Value::Promise(_)));
    assert_eq!(ready(rt.resolve_value(result)).unwrap(), child);
    assert_eq!(*snapshots.borrow(), vec![vec![child.clone()]]);
    assert_detached(&rt, &child);
}

#[test]
fn scalar_only_unbox_returns_boxed_results_unchanged() {
    let mut rt = Runtime::new();
    let child = rt.create_stream(n(7));
    let (promise, _tx) = promise_gate(&mut rt);
    for boxed in [child.clone(), promise] {
        let captured = boxed.clone();
        let context = context(&rt).with_values(vec![boxed.clone()]);
        let result = ready(rt.unbox(
            vec![n(1)],
            context,
            Rc::new(move |_, _, _, _| future::ready(Ok(captured.clone())).boxed_local()),
        ))
        .unwrap();
        assert_eq!(result, boxed);
    }
    assert_detached(&rt, &child);
}

#[test]
fn top_level_awaits_final_promise_but_not_returned_stream_contents() {
    let mut rt = Runtime::new();
    let (payload, _tx) = promise_gate(&mut rt);
    let stream = rt.create_stream(payload.clone());
    let inner = rt.promise(future::ready(Ok(stream.clone())));
    let outer = rt.promise(future::ready(Ok(inner)));
    rt.set_global("p", outer);
    assert_eq!(eval_ready(&mut rt, "p"), stream);
    assert_eq!(rt.stream_value(&stream).unwrap(), payload);
    assert_detached(&rt, &stream);
}

#[test]
fn scalar_and_promise_only_evaluation_still_await_with_or_without_stream_mode() {
    for stream_mode in [false, true] {
        let mut rt = Runtime::new();
        if stream_mode {
            rt.create_stream(Value::Undefined);
        }
        assert_eq!(eval_ready(&mut rt, "1 + 2"), n(3));
        let (promise, tx) = promise_gate(&mut rt);
        rt.set_global("p", promise);
        rt.register_async("fetch", |_| future::ready(Ok(n(2))).boxed_local());
        let ast = lpe::parse("fetch() + p").unwrap();
        let options = EvalOptions::default();
        let mut evaluation = Box::pin(rt.eval_async(&ast, &options));
        assert!(poll_once(evaluation.as_mut()).is_pending());
        tx.send(Ok(n(40))).unwrap();
        assert_eq!(ready(evaluation.as_mut()).unwrap(), n(42));
    }
}

#[test]
fn selected_child_forwards_stream_and_promise_payloads_without_recursive_edges() {
    let mut rt = Runtime::new();
    let trigger = rt.create_stream(n(0));
    let first_nested = rt.create_stream(n(10));
    let second_nested = rt.create_stream(n(20));
    let child = rt.create_stream(first_nested.clone());
    let (promise, tx) = promise_gate(&mut rt);
    let selected = child.clone();
    let context = context(&rt).with_values(vec![child.clone()]);
    let result = ready(rt.unbox(
        vec![trigger.clone()],
        context,
        Rc::new(move |_, _, _, _| future::ready(Ok(selected.clone())).boxed_local()),
    ))
    .unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), first_nested);
    assert_detached(&rt, &first_nested);
    assert_detached(&rt, &second_nested);
    assert_eq!(rt.stream_stats(&child).unwrap().references, 2);
    assert_eq!(rt.stream_stats(&child).unwrap().listeners, 1);
    let events = observe(&mut rt, &result);

    ready(rt.stream_next_async(&child, promise.clone())).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), promise);
    ready(rt.stream_next_async(&child, second_nested.clone())).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), second_nested);
    rt.stream_next(&first_nested, n(11)).unwrap();
    rt.stream_next(&second_nested, n(21)).unwrap();
    assert_eq!(
        *events.borrow(),
        vec![promise.clone(), second_nested.clone()]
    );

    tx.send(Ok(first_nested.clone())).unwrap();
    assert_eq!(
        ready(rt.resolve_value(promise.clone())).unwrap(),
        first_nested
    );
    assert_eq!(rt.stream_value(&result).unwrap(), second_nested);
    assert_eq!(*events.borrow(), vec![promise, second_nested.clone()]);
    assert_detached(&rt, &first_nested);
    assert_detached(&rt, &second_nested);
    rt.stream_release(&result).unwrap();
    assert_detached(&rt, &child);
    assert_detached(&rt, &trigger);
}

#[test]
fn resolver_switches_stream_promise_scalar_stream_without_removing_other_listeners() {
    let mut rt = Runtime::new();
    let trigger = rt.create_stream(n(0));
    let first = rt.create_stream(n(10));
    let second = rt.create_stream(n(20));
    let first_events = observe(&mut rt, &first);
    let second_events = observe(&mut rt, &second);
    let (promise, tx) = promise_gate(&mut rt);
    let choices = vec![first.clone(), promise.clone(), n(42), second.clone()];
    let context = context(&rt).with_values(choices.clone());
    let result = ready(rt.unbox(
        vec![trigger.clone()],
        context,
        Rc::new(move |rt, values, _, _| {
            let index = rt.to_number(&values[0]) as usize;
            future::ready(Ok(choices[index].clone())).boxed_local()
        }),
    ))
    .unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(10));
    assert_eq!(rt.stream_stats(&first).unwrap().listeners, 2);
    assert_eq!(rt.stream_stats(&first).unwrap().references, 2);
    let events = observe(&mut rt, &result);
    ready(rt.stream_next_async(&trigger, n(1))).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), promise);
    assert_eq!(rt.stream_stats(&first).unwrap().listeners, 1);
    assert_eq!(rt.stream_stats(&first).unwrap().references, 1);
    assert_eq!(rt.stream_stats(&second).unwrap().listeners, 1);
    assert_eq!(rt.stream_stats(&second).unwrap().references, 1);
    ready(rt.stream_next_async(&trigger, n(2))).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(42));
    rt.stream_next(&first, n(11)).unwrap();
    rt.stream_next(&second, n(21)).unwrap();
    assert_eq!(*events.borrow(), vec![promise.clone(), n(42)]);
    ready(rt.stream_next_async(&trigger, n(3))).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(21));
    assert_eq!(rt.stream_stats(&second).unwrap().listeners, 2);
    assert_eq!(rt.stream_stats(&second).unwrap().references, 2);

    tx.send(Ok(first.clone())).unwrap();
    assert_eq!(ready(rt.resolve_value(promise.clone())).unwrap(), first);
    assert_eq!(rt.stream_value(&result).unwrap(), n(21));
    assert_eq!(rt.stream_stats(&first).unwrap().listeners, 1);
    assert_eq!(rt.stream_stats(&first).unwrap().references, 1);
    rt.stream_next(&second, n(22)).unwrap();
    assert_eq!(*events.borrow(), vec![promise, n(42), n(21), n(22)]);
    rt.stream_release(&result).unwrap();
    assert_detached(&rt, &trigger);
    for child in [&first, &second] {
        assert_eq!(rt.stream_stats(child).unwrap().references, 1);
        assert_eq!(rt.stream_stats(child).unwrap().listeners, 1);
    }
    assert_eq!(*first_events.borrow(), vec![n(11)]);
    assert_eq!(*second_events.borrow(), vec![n(21), n(22)]);
}

#[test]
fn runtime_drop_releases_unpolled_and_suspended_promise_only_continuations() {
    for started in [false, true] {
        let mut rt = Runtime::new();
        rt.create_stream(Value::Undefined);
        let (input, input_marker) = tracked_pending(&mut rt);
        let resolver_marker = Rc::new(());
        let resolver_weak = Rc::downgrade(&resolver_marker);
        let context = context(&rt);
        let result = ready(rt.unbox(
            vec![input],
            context,
            Rc::new(move |_, values, _, _| {
                let marker = resolver_marker.clone();
                async move {
                    drop(marker);
                    Ok(values[0].clone())
                }
                .boxed_local()
            }),
        ))
        .unwrap();
        assert!(matches!(result, Value::Promise(_)));
        if started {
            let mut resolution = Box::pin(rt.resolve_value(result.clone()));
            assert!(poll_once(resolution.as_mut()).is_pending());
            drop(resolution);
        }
        rt.collect_garbage(std::slice::from_ref(&result));
        assert!(input_marker.upgrade().is_some());
        assert!(resolver_weak.upgrade().is_some());
        drop(rt);
        assert!(
            input_marker.upgrade().is_none(),
            "input leaked; started={started}"
        );
        assert!(
            resolver_weak.upgrade().is_none(),
            "continuation leaked; started={started}"
        );
    }
}

#[test]
fn runtime_drop_releases_a_promise_only_resolver_suspended_after_its_arguments() {
    let mut rt = Runtime::new();
    rt.create_stream(Value::Undefined);
    let input = rt.promise(future::ready(Ok(n(1))));
    let marker = Rc::new(());
    let weak = Rc::downgrade(&marker);
    let calls = Rc::new(Cell::new(0));
    let captured = calls.clone();
    let context = context(&rt);
    let result = ready(rt.unbox(
        vec![input],
        context,
        Rc::new(move |_, _, _, _| {
            captured.set(captured.get() + 1);
            let marker = marker.clone();
            async move {
                let result = future::pending::<Result<Value>>().await;
                drop(marker);
                result
            }
            .boxed_local()
        }),
    ))
    .unwrap();
    let mut resolution = Box::pin(rt.resolve_value(result));
    assert!(poll_once(resolution.as_mut()).is_pending());
    assert_eq!(calls.get(), 1);
    drop(resolution);
    assert!(weak.upgrade().is_some());
    drop(rt);
    assert!(
        weak.upgrade().is_none(),
        "suspended resolver retained its owning runtime"
    );
}

#[test]
fn collection_retires_unrooted_promise_only_continuation_and_its_pending_argument() {
    let mut rt = Runtime::new();
    rt.create_stream(Value::Undefined);
    rt.collect_garbage(&[]);
    let baseline = rt.live_allocations();
    let (input, input_marker) = tracked_pending(&mut rt);
    let marker = Rc::new(());
    let weak = Rc::downgrade(&marker);
    let context = context(&rt);
    let result = ready(rt.unbox(
        vec![input],
        context,
        Rc::new(move |_, values, _, _| {
            let marker = marker.clone();
            async move {
                drop(marker);
                Ok(values[0].clone())
            }
            .boxed_local()
        }),
    ))
    .unwrap();
    let mut resolution = Box::pin(rt.resolve_value(result));
    assert!(poll_once(resolution.as_mut()).is_pending());
    drop(resolution);
    rt.collect_garbage(&[]);
    assert!(
        weak.upgrade().is_none(),
        "unrooted continuation survived collection"
    );
    // Retiring the continuation drops task roots that marked its argument this pass.
    rt.collect_garbage(&[]);
    assert!(input_marker.upgrade().is_none());
    assert_eq!(rt.live_allocations(), baseline);
}

#[test]
fn released_stream_pending_payload_is_collected_when_output_is_no_longer_rooted() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let baseline = rt.live_allocations();
    let (promise, marker) = tracked_pending(&mut rt);
    let selected = promise.clone();
    let context = context(&rt).with_values(vec![promise.clone()]);
    let result = ready(rt.unbox(
        vec![source.clone()],
        context,
        Rc::new(move |_, _, _, _| future::ready(Ok(selected.clone())).boxed_local()),
    ))
    .unwrap();
    let mut resolution = Box::pin(rt.resolve_value(promise));
    assert!(poll_once(resolution.as_mut()).is_pending());
    drop(resolution);
    rt.stream_release(&result).unwrap();
    assert_detached(&rt, &source);
    rt.collect_garbage(&[source.clone(), result.clone()]);
    assert!(
        marker.upgrade().is_some(),
        "the rooted output still owns its last value"
    );
    rt.collect_garbage(std::slice::from_ref(&source));
    assert!(marker.upgrade().is_none());
    assert_eq!(rt.stream_value(&result).unwrap_err().kind, "InvalidHandle");
    assert_eq!(rt.live_allocations(), baseline);
    drop(rt);
    assert!(marker.upgrade().is_none());
}

#[test]
fn failed_initial_computation_releases_captures_and_balances_source_ownership() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let baseline = rt.live_allocations();
    let marker = Rc::new(());
    let weak = Rc::downgrade(&marker);
    let context = context(&rt);
    let error = ready(rt.unbox(
        vec![source.clone()],
        context,
        Rc::new(move |_, _, _, _| {
            let marker = marker.clone();
            async move {
                drop(marker);
                Err(Error::new("AsyncFailure", "initial computation failed"))
            }
            .boxed_local()
        }),
    ))
    .unwrap_err();
    assert_eq!(error.message, "initial computation failed");
    assert!(weak.upgrade().is_none());
    assert_detached(&rt, &source);
    rt.collect_garbage(std::slice::from_ref(&source));
    assert_eq!(rt.live_allocations(), baseline);
}

#[test]
fn abandoned_suspended_initial_computation_is_reclaimed_by_collection() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let baseline = rt.live_allocations();
    let marker = Rc::new(());
    let weak = Rc::downgrade(&marker);
    let context = context(&rt);
    let mut initialization = rt.unbox(
        vec![source.clone()],
        context,
        Rc::new(move |_, _, _, _| {
            let marker = marker.clone();
            async move {
                let result = future::pending::<Result<Value>>().await;
                drop(marker);
                result
            }
            .boxed_local()
        }),
    );
    assert!(poll_once(initialization.as_mut()).is_pending());
    assert!(weak.upgrade().is_some());
    drop(initialization);
    rt.collect_garbage(std::slice::from_ref(&source));
    assert!(weak.upgrade().is_none());
    assert_detached(&rt, &source);
    assert_eq!(rt.live_allocations(), baseline);
}

#[test]
fn failed_or_abandoned_suspended_update_releases_captures_after_output_release() {
    for reject in [false, true] {
        let mut rt = Runtime::new();
        let source = rt.create_stream(n(1));
        let baseline = rt.live_allocations();
        let (tx, rx) = oneshot::channel::<Result<Value>>();
        let receiver = RefCell::new(Some(rx));
        let marker = Rc::new(());
        let weak = Rc::downgrade(&marker);
        let context = context(&rt);
        let result = ready(rt.unbox(
            vec![source.clone()],
            context,
            Rc::new(move |_, values, _, _| {
                let marker = marker.clone();
                let rx = if values[0] == n(1) {
                    None
                } else {
                    receiver.borrow_mut().take()
                };
                async move {
                    let result = if let Some(rx) = rx {
                        rx.await.expect("test sender remains alive")
                    } else {
                        Ok(values[0].clone())
                    };
                    drop(marker);
                    result
                }
                .boxed_local()
            }),
        ))
        .unwrap();
        let mut update = Box::pin(rt.stream_next_async(&source, n(2)));
        assert!(poll_once(update.as_mut()).is_pending());
        if reject {
            tx.send(Err(Error::new("AsyncFailure", "update rejected")))
                .unwrap();
            assert_eq!(
                ready(update.as_mut()).unwrap_err().message,
                "update rejected"
            );
            drop(update);
        } else {
            drop(update);
            assert!(tx.is_canceled());
        }
        assert_eq!(rt.stream_value(&result).unwrap(), n(1));
        assert!(
            weak.upgrade().is_some(),
            "live output still owns its resolver"
        );
        rt.stream_release(&result).unwrap();
        assert!(weak.upgrade().is_none());
        assert_detached(&rt, &source);
        rt.collect_garbage(std::slice::from_ref(&source));
        assert_eq!(rt.live_allocations(), baseline);
        drop(rt);
        assert!(weak.upgrade().is_none());
    }
}

fn native_mixed_operand_trace(expression: &str, state: &str) -> Json {
    fn normalize(rt: &Runtime, value: &Value, operand: &Value) -> Json {
        if value == operand {
            return json!("promise:operand");
        }
        match value {
            Value::Array(_) => Json::Array(
                rt.array_values(value)
                    .unwrap()
                    .iter()
                    .map(|value| normalize(rt, value, operand))
                    .collect(),
            ),
            Value::Number(value) if value.is_finite() => json!(format!("scalar:{value}")),
            Value::String(value) => json!(value),
            _ => panic!("unexpected mixed operand payload: {value:?}"),
        }
    }

    fn settle(
        rt: &mut Runtime,
        operand: &Value,
        tx: oneshot::Sender<Result<Value>>,
        state: &str,
    ) -> Json {
        let outcome = if state.starts_with("rejected") {
            Err(Error::new("OperandFailure", "promise operand rejected"))
        } else {
            Ok(n(40))
        };
        tx.send(outcome.clone()).unwrap();
        let resolved = ready(rt.resolve_value(operand.clone()));
        match outcome {
            Ok(value) => {
                assert_eq!(resolved.unwrap(), value);
                json!(40)
            }
            Err(error) => {
                assert_eq!(resolved.unwrap_err().message, error.message);
                json!({"error": error.message})
            }
        }
    }

    let mut rt = Runtime::new();
    let source = rt.create_stream(n(2));
    rt.set_global("s", source.clone());
    let calls = Rc::new(RefCell::new([0; 3]));
    let captured_calls = calls.clone();
    let returned_stream = source.clone();
    rt.register("stream", move |_| {
        captured_calls.borrow_mut()[0] += 1;
        Ok(returned_stream.clone())
    });
    let (tx, rx) = oneshot::channel::<Result<Value>>();
    let mut tx = Some(tx);
    let mut operand = None;
    if expression.contains("fetch") {
        let receiver = RefCell::new(Some(rx));
        let captured_calls = calls.clone();
        rt.register_async("fetch", move |_| {
            captured_calls.borrow_mut()[2] += 1;
            let rx = receiver.borrow_mut().take().expect("fetch called once");
            async move { rx.await.expect("test sender remains alive") }.boxed_local()
        });
    } else {
        let promise = rt.promise(async move { rx.await.expect("test sender remains alive") });
        rt.set_global("p", promise.clone());
        let captured_calls = calls.clone();
        let returned_promise = promise.clone();
        rt.register("promise", move |_| {
            captured_calls.borrow_mut()[1] += 1;
            Ok(returned_promise.clone())
        });
        operand = Some(promise);
    }
    if state.ends_with("before") {
        settle(
            &mut rt,
            operand.as_ref().unwrap(),
            tx.take().unwrap(),
            state,
        );
    }
    let output = eval_ready(&mut rt, expression);
    assert!(matches!(output, Value::Stream(_)), "{expression}: {state}");
    let first = rt.stream_value(&output).unwrap();
    let operand = operand.unwrap_or_else(|| {
        rt.array_values(&first)
            .unwrap()
            .into_iter()
            .find(|value| matches!(value, Value::Promise(_)))
            .expect("native Promise remains an array element")
    });
    let events = Rc::new(RefCell::new(vec![]));
    let captured_events = events.clone();
    let observer = rt
        .stream_subscribe(&output, move |value| {
            captured_events.borrow_mut().push(value)
        })
        .unwrap();
    let snapshot = |rt: &Runtime, step: &str, history: &[Value], resolution: Option<Json>| {
        let normalize = |value: &Value| normalize(rt, value, &operand);
        let calls = calls.borrow();
        json!({
            "step": step, "resolution": resolution,
            "value": normalize(&rt.stream_value(&output).unwrap()),
            "history": history.iter().map(&normalize).collect::<Vec<_>>(),
            "events": events.borrow().iter().map(&normalize).collect::<Vec<_>>(),
            "calls": {"stream": calls[0], "promise": calls[1], "fetch": calls[2]},
            "streams": ([&source, &output].iter().map(|stream| {
                let stats = rt.stream_stats(stream).unwrap();
                json!({"refs": stats.references, "listeners": stats.listeners})
            }).collect::<Vec<_>>()),
        })
    };
    let mut history = vec![first];
    let mut snapshots = vec![snapshot(&rt, "initial", &history, None)];
    ready(rt.stream_next_async(&source, n(4))).unwrap();
    history.push(rt.stream_value(&output).unwrap());
    snapshots.push(snapshot(&rt, "first_update", &history, None));
    if state.ends_with("after") {
        let resolution = settle(&mut rt, &operand, tx.take().unwrap(), state);
        snapshots.push(snapshot(
            &rt,
            "settled_without_update",
            &history,
            Some(resolution),
        ));
    }
    ready(rt.stream_next_async(&source, n(6))).unwrap();
    history.push(rt.stream_value(&output).unwrap());
    snapshots.push(snapshot(&rt, "second_update", &history, None));
    assert!(rt.stream_unsubscribe(observer));
    rt.stream_release(&output).unwrap();
    assert_detached(&rt, &source);
    snapshots.push(snapshot(&rt, "release_output", &history, None));
    ready(rt.stream_next_async(&source, n(8))).unwrap();
    snapshots.push(snapshot(&rt, "update_after_release", &history, None));
    json!({"expression": expression, "state": state, "snapshots": snapshots})
}

#[test]
#[ignore = "requires Node.js and the current built dist/lpe.js"]
fn mixed_operand_expression_traces_match_current_js_bundle() {
    let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = std::process::Command::new("node")
        .arg(manifest.join("scripts/stream-mixed-reference.cjs"))
        .arg("--operands")
        .current_dir(manifest.parent().unwrap())
        .output()
        .expect("run the opt-in reference audit with Node.js available on PATH");
    assert!(
        output.status.success(),
        "JS reference failed ({}): {}",
        output.status,
        String::from_utf8_lossy(&output.stderr)
    );
    let reference: Vec<Json> = serde_json::from_slice(&output.stdout).unwrap_or_else(|error| {
        panic!(
            "JS reference must emit one JSON trace: {error}\nstdout: {}\nstderr: {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        )
    });
    let mut native = vec![];
    for expression in [
        "list(s, p)",
        "list(p, s)",
        "list(s, fetch())",
        "list(fetch(), s)",
        "stream() + promise()",
        "promise() + stream()",
    ] {
        for state in [
            "pending",
            "fulfilled_before",
            "rejected_before",
            "fulfilled_after",
            "rejected_after",
        ] {
            if expression.contains("fetch") && state.ends_with("before") {
                continue;
            }
            native.push(native_mixed_operand_trace(expression, state));
        }
    }
    assert_eq!(native.len(), 26);
    assert_eq!(
        native.len(),
        reference.len(),
        "mixed expression trace count differs"
    );
    for (native, reference) in native.iter().zip(&reference) {
        assert_eq!(
            native, reference,
            "mixed expression {}: {}",
            reference["expression"], reference["state"]
        );
    }
}

fn native_mixed_reference_trace() -> Vec<Json> {
    let mut rt = Runtime::new();
    let control = rt.create_stream(n(0));
    let nested_a = rt.create_stream(n(10));
    let nested_b = rt.create_stream(n(20));
    let child_a = rt.create_stream(nested_a.clone());
    let child_b = rt.create_stream(n(30));
    let (payload_promise, payload_tx) = promise_gate(&mut rt);
    let (branch_promise, branch_tx) = promise_gate(&mut rt);
    let child_a_events = observe(&mut rt, &child_a);
    let child_b_events = observe(&mut rt, &child_b);
    let choices = vec![
        child_a.clone(),
        branch_promise.clone(),
        n(42),
        child_b.clone(),
    ];
    let calls = Rc::new(Cell::new(0));
    let captured_calls = calls.clone();
    let context = context(&rt).with_values(choices.clone());
    let output = ready(rt.unbox(
        vec![control.clone()],
        context,
        Rc::new(move |rt, values, _, _| {
            captured_calls.set(captured_calls.get() + 1);
            let index = rt.to_number(&values[0]) as usize;
            future::ready(Ok(choices[index].clone())).boxed_local()
        }),
    ))
    .unwrap();
    let events = Rc::new(RefCell::new(vec![]));
    let captured_events = events.clone();
    let observer = rt
        .stream_subscribe(&output, move |value| {
            captured_events.borrow_mut().push(value);
        })
        .unwrap();
    let streams = [
        ("control", control.clone()),
        ("nested_a", nested_a.clone()),
        ("nested_b", nested_b.clone()),
        ("child_a", child_a.clone()),
        ("child_b", child_b.clone()),
        ("output", output.clone()),
    ];
    let promises = [
        ("payload", payload_promise.clone()),
        ("branch", branch_promise.clone()),
    ];
    let normalize = |value: &Value| -> String {
        if let Some((name, _)) = streams.iter().find(|(_, stream)| stream == value) {
            return format!("stream:{name}");
        }
        if let Some((name, _)) = promises.iter().find(|(_, promise)| promise == value) {
            return format!("promise:{name}");
        }
        if let Value::Number(value) = value {
            if value.is_finite() {
                return format!("scalar:{value}");
            }
        }
        panic!("unexpected value outside the named mixed-stream scenario: {value:?}");
    };
    let snapshot = |rt: &Runtime, step: &str, resolution: Option<&Value>| -> Json {
        json!({
            "step": step,
            "value": normalize(&rt.stream_value(&output).unwrap()),
            "resolution": resolution.map(normalize),
            "calls": calls.get(),
            "events": events.borrow().iter().map(&normalize).collect::<Vec<_>>(),
            "childEvents": {
                "a": child_a_events.borrow().iter().map(&normalize).collect::<Vec<_>>(),
                "b": child_b_events.borrow().iter().map(&normalize).collect::<Vec<_>>(),
            },
            "streams": streams.iter().map(|(name, stream)| {
                let stats = rt.stream_stats(stream).unwrap();
                json!({
                    "name": name,
                    "value": normalize(&rt.stream_value(stream).unwrap()),
                    "refs": stats.references,
                    "listeners": stats.listeners,
                })
            }).collect::<Vec<_>>(),
        })
    };

    let mut snapshots = vec![snapshot(&rt, "initial_shallow_child", None)];
    ready(rt.stream_next_async(&child_a, payload_promise.clone())).unwrap();
    snapshots.push(snapshot(&rt, "child_promise", None));
    ready(rt.stream_next_async(&child_a, nested_b.clone())).unwrap();
    snapshots.push(snapshot(&rt, "child_stream", None));
    rt.stream_next(&nested_a, n(11)).unwrap();
    rt.stream_next(&nested_b, n(21)).unwrap();
    snapshots.push(snapshot(&rt, "nested_updates", None));
    payload_tx.send(Ok(nested_a.clone())).unwrap();
    let resolved_payload = ready(rt.resolve_value(payload_promise.clone())).unwrap();
    snapshots.push(snapshot(
        &rt,
        "payload_settled_to_stream",
        Some(&resolved_payload),
    ));
    rt.stream_next(&child_a, n(7)).unwrap();
    snapshots.push(snapshot(&rt, "child_scalar", None));
    rt.stream_next(&control, n(0)).unwrap();
    snapshots.push(snapshot(&rt, "resolver_same_child", None));
    ready(rt.stream_next_async(&control, n(1))).unwrap();
    snapshots.push(snapshot(&rt, "childSwitch_to_promise", None));
    rt.stream_next(&child_a, n(8)).unwrap();
    snapshots.push(snapshot(&rt, "inactive_child_update", None));
    branch_tx.send(Ok(child_a.clone())).unwrap();
    let resolved_branch = ready(rt.resolve_value(branch_promise)).unwrap();
    snapshots.push(snapshot(
        &rt,
        "branch_settled_to_stream",
        Some(&resolved_branch),
    ));
    rt.stream_next(&control, n(2)).unwrap();
    snapshots.push(snapshot(&rt, "childSwitch_to_scalar", None));
    rt.stream_next(&control, n(3)).unwrap();
    snapshots.push(snapshot(&rt, "childSwitch_to_other_stream", None));
    rt.stream_next(&child_a, n(9)).unwrap();
    snapshots.push(snapshot(&rt, "previous_child_update", None));
    ready(rt.stream_next_async(&child_b, payload_promise)).unwrap();
    snapshots.push(snapshot(&rt, "other_child_fulfilled_promise", None));
    rt.stream_next(&child_b, nested_a).unwrap();
    snapshots.push(snapshot(&rt, "other_child_stream", None));
    rt.stream_next(&child_b, n(31)).unwrap();
    snapshots.push(snapshot(&rt, "other_child_scalar", None));
    assert!(rt.stream_unsubscribe(observer));
    rt.stream_release(&output).unwrap();
    snapshots.push(snapshot(&rt, "release_output", None));
    rt.stream_next(&child_b, n(32)).unwrap();
    rt.stream_next(&control, n(0)).unwrap();
    snapshots.push(snapshot(&rt, "updates_after_release", None));
    snapshots
}

#[test]
#[ignore = "requires Node.js and the current built dist/lpe.js"]
fn mixed_returned_payload_trace_matches_current_js_bundle() {
    let manifest = std::path::Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = std::process::Command::new("node")
        .arg(manifest.join("scripts/stream-mixed-reference.cjs"))
        .current_dir(manifest.parent().unwrap())
        .output()
        .expect("run the opt-in reference audit with Node.js available on PATH");
    assert!(
        output.status.success(),
        "JS reference failed ({}): {}",
        output.status,
        String::from_utf8_lossy(&output.stderr)
    );
    let reference: Vec<Json> = serde_json::from_slice(&output.stdout).unwrap_or_else(|error| {
        panic!(
            "JS reference must emit one JSON trace: {error}\nstdout: {}\nstderr: {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        )
    });
    let native = native_mixed_reference_trace();
    assert_eq!(native.len(), reference.len(), "mixed trace length differs");
    for (index, (native, reference)) in native.iter().zip(&reference).enumerate() {
        assert_eq!(
            native, reference,
            "mixed trace snapshot {index}: {}",
            reference["step"]
        );
    }
}
