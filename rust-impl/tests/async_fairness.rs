use futures::{channel::oneshot, task::noop_waker};
use lpe::{parse, Error, EvalOptions, Runtime, Value};
use std::cell::Cell;
use std::future::Future;
use std::rc::Rc;
use std::task::{Context, Poll};

#[test]
fn already_rejected_async_argument_still_starts_its_siblings() {
    let mut runtime = Runtime::new();
    let calls = Rc::new(Cell::new(0));
    let side_calls = calls.clone();
    runtime.register("side", move |_| {
        side_calls.set(side_calls.get() + 1);
        Ok(Value::Number(2.0))
    });
    runtime.register_async("fail", |_| {
        Box::pin(async { Err(Error::new("Error", "failed")) })
    });
    let error = runtime.eval("add(fail(),side())").unwrap_err();
    assert!(error.is_async);
    assert_eq!(calls.get(), 1);
}

#[test]
fn synchronous_argument_error_does_not_start_later_siblings() {
    let mut runtime = Runtime::new();
    let calls = Rc::new(Cell::new(0));
    let side_calls = calls.clone();
    runtime.register("side", move |_| {
        side_calls.set(side_calls.get() + 1);
        Ok(Value::Number(2.0))
    });
    runtime.register("fail", |_| Err(Error::new("Error", "failed")));
    let error = runtime.eval("add(fail(),side())").unwrap_err();
    assert!(!error.is_async);
    assert_eq!(calls.get(), 0);
}

#[test]
fn regular_host_callback_returning_a_promise_is_awaited() {
    let mut runtime = Runtime::new();
    let (sender, receiver) = oneshot::channel();
    let promise = runtime.promise(async move { receiver.await.unwrap() });
    runtime.register("shared", move |_| Ok(promise.clone()));
    let ast = parse("shared()").unwrap();
    let options = EvalOptions::default();
    let mut evaluation = Box::pin(runtime.eval_async(&ast, &options));
    let waker = noop_waker();
    let mut context = Context::from_waker(&waker);
    assert!(evaluation.as_mut().poll(&mut context).is_pending());
    sender.send(Ok(Value::Number(42.0))).unwrap();
    for _ in 0..8 {
        if let Poll::Ready(result) = evaluation.as_mut().poll(&mut context) {
            assert_eq!(result.unwrap(), Value::Number(42.0));
            return;
        }
    }
    panic!("resolved host promise did not settle");
}
