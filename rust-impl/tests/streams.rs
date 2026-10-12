use futures::{executor::block_on, FutureExt};
use lpe::{Error, EvalOptions, Runtime, StreamContext, Value};
use std::{
    cell::{Cell, RefCell},
    future::Future,
    rc::Rc,
    task::{Context, Poll},
};

fn n(value: i32) -> Value {
    Value::Number(value as f64)
}
fn context(rt: &Runtime) -> StreamContext {
    StreamContext::new(rt.global_env(), &EvalOptions::default())
}

#[test]
fn arithmetic_updates_and_duplicate_arguments_preserve_notification_order() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(2));
    rt.set_global("a", source.clone());
    let result = rt.eval("a + a").unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(4));
    assert_eq!(rt.stream_stats(&source).unwrap().references, 3);
    assert_eq!(rt.stream_stats(&source).unwrap().listeners, 2);
    let events = Rc::new(RefCell::new(vec![]));
    let observed = events.clone();
    rt.stream_subscribe(&result, move |value| observed.borrow_mut().push(value))
        .unwrap();
    rt.stream_next(&source, n(3)).unwrap();
    assert_eq!(*events.borrow(), vec![n(5), n(6)]);
    rt.stream_release(&result).unwrap();
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
    assert_eq!(rt.stream_stats(&source).unwrap().listeners, 0);
    rt.stream_next(&source, n(4)).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(6));
}

#[test]
fn same_child_is_reused_without_retain_or_duplicate_notifications() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let child = rt.create_stream(n(2));
    let selected = child.clone();
    let context = context(&rt).with_values(vec![child.clone()]);
    let result = block_on(rt.unbox(
        vec![source.clone()],
        context,
        Rc::new(move |_, _, _, _| {
            let value = selected.clone();
            async move { Ok(value) }.boxed_local()
        }),
    ))
    .unwrap();
    let events = Rc::new(RefCell::new(vec![]));
    let observed = events.clone();
    rt.stream_subscribe(&result, move |value| observed.borrow_mut().push(value))
        .unwrap();
    rt.stream_next(&source, n(2)).unwrap();
    assert!(events.borrow().is_empty());
    assert_eq!(rt.stream_stats(&child).unwrap().references, 2);
    assert_eq!(rt.stream_stats(&child).unwrap().listeners, 1);
    rt.stream_next(&child, n(3)).unwrap();
    assert_eq!(*events.borrow(), vec![n(3)]);
    rt.stream_release(&result).unwrap();
    assert_eq!(rt.stream_stats(&child).unwrap().references, 1);
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
}

#[test]
fn release_and_subscription_disposal_are_explicit() {
    let mut rt = Runtime::new();
    let calls = Rc::new(Cell::new(0));
    let disposed = calls.clone();
    let stream = rt.create_stream_with_dispose(n(1), move || disposed.set(disposed.get() + 1));
    let subscription = rt.stream_subscribe(&stream, |_| {}).unwrap();
    assert!(rt.stream_unsubscribe(subscription));
    assert!(!rt.stream_unsubscribe(subscription));
    rt.stream_retain(&stream).unwrap();
    rt.stream_release(&stream).unwrap();
    assert_eq!(calls.get(), 0);
    rt.stream_release(&stream).unwrap();
    assert_eq!(calls.get(), 1);
    assert!(rt.stream_stats(&stream).unwrap().disposed);
    assert_eq!(
        rt.stream_release(&stream).unwrap_err().kind,
        "StreamDisposed"
    );
    assert_eq!(
        rt.stream_retain(&stream).unwrap_err().kind,
        "StreamDisposed"
    );
    assert_eq!(
        rt.stream_next(&stream, n(2)).unwrap_err().kind,
        "StreamDisposed"
    );
    assert_eq!(
        rt.stream_subscribe(&stream, |_| {}).unwrap_err().kind,
        "StreamDisposed"
    );
    drop(rt);
    assert_eq!(calls.get(), 1);
}

#[test]
fn dropping_runtime_disposes_unreleased_host_streams_once() {
    let calls = Rc::new(Cell::new(0));
    {
        let mut rt = Runtime::new();
        let observed = calls.clone();
        let stream = rt.create_stream_with_dispose(n(1), move || observed.set(observed.get() + 1));
        rt.set_global("a", stream);
        rt.eval("a + 1").unwrap();
    }
    assert_eq!(calls.get(), 1);
}

#[test]
fn initialization_failure_rolls_back_all_input_retains() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let context = context(&rt);
    let error = block_on(rt.unbox(
        vec![source.clone(), source.clone()],
        context,
        Rc::new(|_, _, _, _| {
            async { Err(Error::new("Error", "initialization failed")) }.boxed_local()
        }),
    ))
    .unwrap_err();
    assert_eq!(error.message, "initialization failed");
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
    assert_eq!(rt.stream_stats(&source).unwrap().listeners, 0);
    let disposed = rt.create_stream(n(2));
    rt.stream_release(&disposed).unwrap();
    let context = StreamContext::new(rt.global_env(), &EvalOptions::default());
    assert!(block_on(rt.unbox(
        vec![source.clone(), disposed],
        context,
        Rc::new(|_, _, _, _| { async { Ok(n(0)) }.boxed_local() })
    ))
    .is_err());
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
}

#[test]
fn update_errors_preserve_last_result_and_can_recover() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let context = context(&rt);
    let result = block_on(rt.unbox(
        vec![source.clone()],
        context,
        Rc::new(|_, args, _, _| {
            async move {
                if args[0] == n(2) {
                    Err(Error::new("Error", "update failed"))
                } else {
                    Ok(args[0].clone())
                }
            }
            .boxed_local()
        }),
    ))
    .unwrap();
    assert_eq!(
        rt.stream_next(&source, n(2)).unwrap_err().message,
        "update failed"
    );
    assert_eq!(rt.stream_value(&result).unwrap(), n(1));
    rt.stream_next(&source, n(3)).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(3));
    rt.stream_release(&result).unwrap();
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
}

#[test]
fn collector_traces_stream_inputs_results_and_callback_roots() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let payload = rt.array(vec![n(42)]);
    let captured = payload.clone();
    let context = context(&rt).with_values(vec![payload.clone()]);
    let result = block_on(rt.unbox(
        vec![source.clone()],
        context,
        Rc::new(move |rt, _, _, _| {
            let payload = captured.clone();
            async move {
                rt.collect_garbage(&[]);
                assert_eq!(rt.array_values(&payload)?, vec![n(42)]);
                Ok(payload)
            }
            .boxed_local()
        }),
    ))
    .unwrap();
    rt.collect_garbage(std::slice::from_ref(&result));
    rt.stream_next(&source, n(2)).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), payload);
    rt.stream_release(&result).unwrap();
    rt.collect_garbage(&[]);
    assert_eq!(rt.stream_value(&source).unwrap_err().kind, "InvalidHandle");
    assert!(rt.array_values(&payload).is_err());
}

#[test]
fn source_subscription_keeps_derived_computation_reachable() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let context = context(&rt);
    let result = block_on(rt.unbox(
        vec![source.clone()],
        context,
        Rc::new(|_, values, _, _| async move { Ok(values[0].clone()) }.boxed_local()),
    ))
    .unwrap();
    rt.collect_garbage(std::slice::from_ref(&source));
    rt.stream_next(&source, n(2)).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(2));
    rt.stream_release(&result).unwrap();
}

#[test]
fn selected_child_is_rooted_while_downstream_callbacks_collect() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let ctx = context(&rt);
    let result = block_on(rt.unbox(
        vec![source.clone()],
        ctx,
        Rc::new(|rt, args, _, _| {
            async move { Ok(rt.create_stream(args[0].clone())) }.boxed_local()
        }),
    ))
    .unwrap();
    let ctx = context(&rt);
    let downstream = block_on(rt.unbox(
        vec![result.clone()],
        ctx,
        Rc::new(|rt, args, _, _| {
            async move {
                rt.collect_garbage(&[]);
                Ok(args[0].clone())
            }
            .boxed_local()
        }),
    ))
    .unwrap();
    rt.stream_next(&source, n(2)).unwrap();
    assert_eq!(rt.stream_value(&downstream).unwrap(), n(2));
    rt.stream_release(&downstream).unwrap();
    rt.stream_release(&result).unwrap();
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
}

#[test]
fn collection_reclaims_stream_graphs_and_invalidates_stale_handles() {
    let mut rt = Runtime::new();
    let baseline = rt.live_allocations();
    let mut stale = Value::Undefined;
    for _ in 0..100 {
        let source = rt.create_stream(n(1));
        let context = context(&rt);
        let result = block_on(rt.unbox(
            vec![source.clone()],
            context,
            Rc::new(|_, args, _, _| async move { Ok(args[0].clone()) }.boxed_local()),
        ))
        .unwrap();
        rt.stream_next(&source, n(2)).unwrap();
        rt.stream_release(&result).unwrap();
        stale = source;
        rt.collect_garbage(&[]);
        assert_eq!(rt.live_allocations(), baseline);
    }
    let fresh = rt.create_stream(n(9));
    assert_ne!(fresh, stale);
    assert_eq!(rt.stream_value(&stale).unwrap_err().kind, "InvalidHandle");
}

#[test]
fn stream_values_cannot_silently_turn_into_json_objects() {
    let mut rt = Runtime::new();
    let stream = rt.create_stream(n(1));
    assert!(rt
        .to_json(&stream)
        .unwrap_err()
        .message
        .contains("Streams cannot be serialized"));
    rt.stream_next(&stream, stream.clone()).unwrap();
    rt.collect_garbage(std::slice::from_ref(&stream));
    assert_eq!(rt.stream_value(&stream).unwrap(), stream);
}

#[test]
fn unbox_with_streams_preserves_raw_promise_arguments_like_js() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let promise = rt.promise(futures::future::pending());
    let context = context(&rt);
    let result = block_on(rt.unbox(
        vec![source.clone(), promise],
        context,
        Rc::new(|_, args, _, _| {
            async move { Ok(Value::Bool(matches!(args[1], Value::Promise(_)))) }.boxed_local()
        }),
    ))
    .unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), Value::Bool(true));
    rt.stream_next(&source, n(2)).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), Value::Bool(true));
}

#[test]
fn nested_stream_payloads_keep_object_identity_and_type_without_unwrapping_again() {
    let mut rt = Runtime::new();
    let child = rt.create_stream(n(42));
    let outer = rt.create_stream(child.clone());
    rt.set_global("outer", outer.clone());
    for (source, expected) in [
        ("isHash(outer)", Value::Bool(true)),
        ("isObj(outer)", Value::Bool(true)),
        ("classOf(outer)", Value::String("[object Object]".into())),
        ("toStr(outer)", Value::String("[object Object]".into())),
    ] {
        let result = rt.eval(source).unwrap();
        assert_eq!(rt.stream_value(&result).unwrap(), expected);
        rt.stream_release(&result).unwrap();
    }
    for source in ["str(outer)", "jsonStringify(outer)"] {
        assert!(rt
            .eval(source)
            .unwrap_err()
            .message
            .contains("Streams cannot be serialized"));
    }
    assert_eq!(rt.stream_stats(&child).unwrap().references, 1);
    assert_eq!(rt.stream_stats(&child).unwrap().listeners, 0);
}

#[test]
fn cancellation_rejects_updates_without_corrupting_subscriptions() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    rt.set_global("a", source.clone());
    let result = rt.eval("a + 1").unwrap();
    let token = rt.cancellation_token();
    token.store(true, std::sync::atomic::Ordering::Relaxed);
    assert_eq!(rt.stream_next(&source, n(2)).unwrap_err().kind, "Cancelled");
    assert_eq!(rt.stream_value(&result).unwrap(), n(2));
    token.store(false, std::sync::atomic::Ordering::Relaxed);
    rt.stream_next(&source, n(3)).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(4));
    rt.stream_release(&result).unwrap();
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
}

#[test]
fn dropping_suspended_construction_rolls_back_retains() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let ctx = context(&rt);
    let mut construction = rt.unbox(
        vec![source.clone()],
        ctx,
        Rc::new(|_, _, _, _| futures::future::pending().boxed_local()),
    );
    let mut cx = Context::from_waker(futures::task::noop_waker_ref());
    assert!(construction.as_mut().poll(&mut cx).is_pending());
    drop(construction);
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
    assert_eq!(rt.stream_stats(&source).unwrap().listeners, 0);
}

#[test]
fn cancellation_interrupts_a_pending_update_on_repoll() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let calls = Rc::new(Cell::new(0));
    let ctx = context(&rt);
    let result = block_on(rt.unbox(
        vec![source.clone()],
        ctx,
        Rc::new(move |_, values, _, _| {
            calls.set(calls.get() + 1);
            if calls.get() == 2 {
                return futures::future::pending().boxed_local();
            }
            async move { Ok(values[0].clone()) }.boxed_local()
        }),
    ))
    .unwrap();
    let token = rt.cancellation_token();
    let mut update = Box::pin(rt.stream_next_async(&source, n(2)));
    let mut cx = Context::from_waker(futures::task::noop_waker_ref());
    assert!(update.as_mut().poll(&mut cx).is_pending());
    token.store(true, std::sync::atomic::Ordering::Relaxed);
    match update.as_mut().poll(&mut cx) {
        Poll::Ready(Err(error)) => assert_eq!(error.kind, "Cancelled"),
        other => panic!("Expected cancellation, got {other:?}"),
    }
    drop(update);
    token.store(false, std::sync::atomic::Ordering::Relaxed);
    assert_eq!(rt.stream_value(&result).unwrap(), n(1));
    rt.stream_next(&source, n(3)).unwrap();
    assert_eq!(rt.stream_value(&result).unwrap(), n(3));
    rt.stream_release(&result).unwrap();
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
}

#[test]
fn dropped_update_releases_uncommitted_child_retain() {
    let mut rt = Runtime::new();
    let source = rt.create_stream(n(1));
    let children = Rc::new(RefCell::new(vec![]));
    let observed = children.clone();
    let ctx = context(&rt);
    let result = block_on(rt.unbox(
        vec![source.clone()],
        ctx,
        Rc::new(move |rt, values, _, _| {
            let child = rt.create_stream(values[0].clone());
            observed.borrow_mut().push(child.clone());
            async move { Ok(child) }.boxed_local()
        }),
    ))
    .unwrap();
    let ctx = context(&rt);
    let downstream = block_on(rt.unbox(
        vec![result.clone()],
        ctx,
        Rc::new(|_, values, _, _| {
            if values[0] == n(2) {
                return futures::future::pending().boxed_local();
            }
            async move { Ok(values[0].clone()) }.boxed_local()
        }),
    ))
    .unwrap();
    let mut update = Box::pin(rt.stream_next_async(&source, n(2)));
    let mut cx = Context::from_waker(futures::task::noop_waker_ref());
    assert!(update.as_mut().poll(&mut cx).is_pending());
    drop(update);
    let child = children.borrow().last().unwrap().clone();
    assert_eq!(rt.stream_stats(&child).unwrap().references, 1);
    assert_eq!(rt.stream_stats(&child).unwrap().listeners, 0);
    rt.stream_release(&downstream).unwrap();
    rt.stream_release(&result).unwrap();
    assert_eq!(rt.stream_stats(&source).unwrap().references, 1);
}
