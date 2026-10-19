use lpe::{Error, Result, Runtime, RuntimeControls, RuntimeLimits, Value};
use std::{
    alloc::{GlobalAlloc, Layout, System},
    cell::Cell,
    mem::size_of,
    num::NonZeroUsize,
    rc::Rc,
};

struct ObservedAllocator;

thread_local! {
    static WATCH: Cell<Option<(usize, usize)>> = const { Cell::new(None) };
}

fn record(size: usize) {
    let _ = WATCH.try_with(|watch| {
        if let Some((target, count)) = watch.get() {
            if target == size {
                watch.set(Some((target, count + 1)));
            }
        }
    });
}

// Every request is forwarded unchanged to System; observation is thread-local
// and does not allocate, so other tests cannot affect the measured call.
unsafe impl GlobalAlloc for ObservedAllocator {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        record(layout.size());
        unsafe { System.alloc(layout) }
    }

    unsafe fn alloc_zeroed(&self, layout: Layout) -> *mut u8 {
        record(layout.size());
        unsafe { System.alloc_zeroed(layout) }
    }

    unsafe fn realloc(&self, pointer: *mut u8, layout: Layout, size: usize) -> *mut u8 {
        record(size);
        unsafe { System.realloc(pointer, layout, size) }
    }

    unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
        unsafe { System.dealloc(pointer, layout) }
    }
}

#[global_allocator]
static ALLOCATOR: ObservedAllocator = ObservedAllocator;

struct Watch;

impl Watch {
    fn start(size: usize) -> Self {
        assert!(WATCH.replace(Some((size, 0))).is_none());
        Self
    }

    fn count(&self) -> usize {
        WATCH.get().unwrap().1
    }
}

impl Drop for Watch {
    fn drop(&mut self) {
        WATCH.set(None);
    }
}

const PAYLOAD_LEN: usize = 16_381;

fn payload(utf16: bool) -> Value {
    if utf16 {
        Value::Utf16(vec![0xd800; PAYLOAD_LEN])
    } else {
        Value::String("x".repeat(PAYLOAD_LEN))
    }
}

fn payload_bytes(utf16: bool) -> usize {
    PAYLOAD_LEN * if utf16 { size_of::<u16>() } else { 1 }
}

fn dispatch(
    name: &'static str,
    bytes: Option<usize>,
    interrupt: bool,
    legacy: bool,
    utf16: bool,
) -> (Runtime, Result<Value>, usize) {
    let mut rt = Runtime::new();
    rt.set_legacy_context(legacy);
    let armed = Rc::new(Cell::new(false));
    let polls = Rc::new(Cell::new(0));
    if let Some(bytes) = bytes {
        let armed = armed.clone();
        let polls = polls.clone();
        let controls = RuntimeControls::new(RuntimeLimits {
            max_intermediate_bytes: bytes,
            ..RuntimeLimits::default()
        })
        .with_interrupt_hook(NonZeroUsize::new(1).unwrap(), move || {
            if armed.get() {
                polls.set(polls.get() + 1);
                // The first checkpoint enters the call; the second is the
                // list builder's first item, before any payload is authorized.
                if interrupt && polls.get() == 2 {
                    return Err(Error::new("Cancelled", "list item interrupt"));
                }
            }
            Ok(())
        });
        rt.set_controls(Some(controls)).unwrap();
    }
    let observed = Rc::new(Cell::new(None));
    let copies = observed.clone();
    rt.register_special("probe", move |rt, _, env, options| {
        let copies = copies.clone();
        let armed = armed.clone();
        Box::pin(async move {
            // Prepare arguments before observing: this isolates the final list
            // copy, not the pre-existing allocations during argument evaluation.
            let args = vec![
                Value::Null,
                Value::Bool(true),
                Value::Number(7.0),
                payload(utf16),
            ];
            let watch = Watch::start(payload_bytes(utf16));
            armed.set(true);
            let result = rt
                .call_with_options(Value::Builtin(name.into()), args, env, &options)
                .await;
            armed.set(false);
            copies.set(Some(watch.count()));
            result
        })
    });
    let result = rt.eval("probe()");
    if bytes.is_some() {
        assert_eq!(
            polls.get(),
            if interrupt || bytes == Some(0) { 2 } else { 5 }
        );
    }
    (rt, result, observed.get().expect("probe completed"))
}

fn recovery(rt: &mut Runtime) {
    rt.set_controls(Some(RuntimeControls::new(RuntimeLimits::default())))
        .unwrap();
    assert_eq!(rt.eval("2+3").unwrap(), Value::Number(5.0));
}

#[test]
fn exhausted_list_budget_does_not_copy_later_payloads() {
    for name in ["list", "array", "["] {
        for legacy in [false, true] {
            for utf16 in [false, true] {
                let (mut rt, result, copies) = dispatch(name, Some(0), false, legacy, utf16);
                let error = result.unwrap_err();
                assert_eq!(error.kind, "LimitError");
                assert_eq!(error.message, "Intermediate allocation budget exceeded");
                assert_eq!(rt.control_usage().intermediate_bytes, 0);
                assert_eq!(copies, 0, "{name} legacy={legacy} utf16={utf16}");
                recovery(&mut rt);
            }
        }
    }
}

#[test]
fn insufficient_payload_budget_charges_values_but_does_not_copy_payload() {
    for name in ["list", "array", "["] {
        for utf16 in [false, true] {
            let value_bytes = 4 * size_of::<Value>();
            let budget = value_bytes + payload_bytes(utf16) - 1;
            let (mut rt, result, copies) = dispatch(name, Some(budget), false, true, utf16);
            assert_eq!(result.unwrap_err().kind, "LimitError");
            assert_eq!(rt.control_usage().intermediate_bytes, value_bytes);
            assert_eq!(copies, 0, "{name} utf16={utf16}");
            recovery(&mut rt);
        }
    }
}

#[test]
fn list_item_interrupt_precedes_payload_copy() {
    for name in ["list", "array", "["] {
        for utf16 in [false, true] {
            let (mut rt, result, copies) = dispatch(name, Some(usize::MAX), true, true, utf16);
            let error = result.unwrap_err();
            assert_eq!(error.kind, "Cancelled");
            assert_eq!(error.message, "list item interrupt");
            assert_eq!(rt.control_usage().intermediate_bytes, 0);
            assert_eq!(copies, 0, "{name} utf16={utf16}");
            recovery(&mut rt);
        }
    }
}

#[test]
fn successful_lists_keep_payloads_and_exact_accounting() {
    for name in ["list", "array", "["] {
        for utf16 in [false, true] {
            let expected_bytes = 4 * size_of::<Value>() + payload_bytes(utf16);
            for legacy in [false, true] {
                for budget in [None, Some(expected_bytes)] {
                    let (rt, result, copies) = dispatch(name, budget, false, legacy, utf16);
                    assert_eq!(
                        rt.array_values(&result.unwrap()).unwrap(),
                        vec![
                            Value::Null,
                            Value::Bool(true),
                            Value::Number(7.0),
                            payload(utf16)
                        ]
                    );
                    assert_eq!(copies, 1, "{name} budget={budget:?} utf16={utf16}");
                    assert_eq!(
                        rt.control_usage().intermediate_bytes,
                        if budget.is_some() { expected_bytes } else { 0 }
                    );
                }
            }
        }
    }
}
