use super::{EvalOptions, Runtime};
use crate::{Error, Result, Value};
use std::{cell::RefCell, num::NonZeroUsize, rc::Rc, sync::atomic::Ordering};

/// Opt-in cooperative limits, not a process heap quota. Bytes count charged
/// intermediate payloads cumulatively, including payloads subsequently discarded.
#[derive(Clone, Debug)]
pub struct RuntimeLimits {
    pub max_work: usize,
    pub max_intermediate_bytes: usize,
    pub max_depth: usize,
}

impl Default for RuntimeLimits {
    fn default() -> Self {
        Self {
            max_work: usize::MAX,
            max_intermediate_bytes: usize::MAX,
            max_depth: 256,
        }
    }
}

/// The hook runs synchronously on the evaluating thread. It must return normally:
/// do not panic, longjmp, or unwind through an FFI boundary. No threads or signals
/// are installed. Interior mutability can be used for host-owned hook state.
#[derive(Clone)]
pub struct RuntimeControls {
    limits: RuntimeLimits,
    interval: NonZeroUsize,
    hook: Option<Rc<dyn Fn() -> Result<()>>>,
}

impl RuntimeControls {
    pub fn new(limits: RuntimeLimits) -> Self {
        Self {
            limits,
            interval: NonZeroUsize::new(1024).unwrap(),
            hook: None,
        }
    }

    pub fn with_interrupt_hook(
        mut self,
        interval: NonZeroUsize,
        hook: impl Fn() -> Result<()> + 'static,
    ) -> Self {
        self.interval = interval;
        self.hook = Some(Rc::new(hook));
        self
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ControlUsage {
    pub work: usize,
    pub intermediate_bytes: usize,
}

pub(super) struct EvaluationControl {
    config: RuntimeControls,
    state: RefCell<State>,
}

struct State {
    limits: RuntimeLimits,
    usage: ControlUsage,
    until_poll: usize,
    error: Option<Error>,
}

impl EvaluationControl {
    pub(super) fn fail(&self, error: Error) -> Error {
        self.state.borrow_mut().error.get_or_insert(error).clone()
    }

    pub(super) fn status(&self) -> Result<()> {
        self.state.borrow().error.clone().map_or(Ok(()), Err)
    }

    pub(super) fn work(&self) -> Result<()> {
        self.status()?;
        let poll = {
            let mut s = self.state.borrow_mut();
            if s.usage.work >= s.limits.max_work {
                drop(s);
                return Err(self.fail(Error::new("LimitError", "Evaluation work limit exceeded")));
            }
            s.usage.work += 1;
            if s.until_poll == 0 {
                s.until_poll = self.config.interval.get() - 1;
                true
            } else {
                s.until_poll -= 1;
                false
            }
        };
        // Never hold a control/arena borrow across a host callback.
        if poll {
            if let Some(hook) = &self.config.hook {
                hook().map_err(|e| self.fail(e))?;
            }
        }
        Ok(())
    }

    fn charge(&self, bytes: Option<usize>) -> Result<()> {
        self.status()?;
        let mut s = self.state.borrow_mut();
        if let Some(total) = bytes.and_then(|n| s.usage.intermediate_bytes.checked_add(n)) {
            if total <= s.limits.max_intermediate_bytes {
                s.usage.intermediate_bytes = total;
                return Ok(());
            }
        }
        drop(s);
        Err(self.fail(Error::new(
            "LimitError",
            "Intermediate allocation budget exceeded",
        )))
    }
}

pub(super) type ControlSlot = Rc<RefCell<Option<Rc<EvaluationControl>>>>;

pub(super) struct ControlScope(ControlSlot);
impl Drop for ControlScope {
    fn drop(&mut self) {
        self.0.borrow_mut().take();
    }
}

impl Runtime {
    /// Configure future top-level evaluations; an active evaluation cannot replace
    /// or disable its controls. Nested evaluations inherit the active budget.
    pub fn set_controls(&mut self, controls: Option<RuntimeControls>) -> Result<()> {
        if self.control.borrow().is_some() {
            return Err(Error::new(
                "OptionsError",
                "Cannot replace active runtime controls",
            ));
        }
        self.controls = controls;
        Ok(())
    }

    /// Usage from the current or most recent controlled evaluation.
    pub fn control_usage(&self) -> ControlUsage {
        self.last_control
            .as_ref()
            .map_or(ControlUsage::default(), |c| c.state.borrow().usage)
    }

    pub(super) fn enter_controls(&mut self, options: &EvalOptions) -> Option<ControlScope> {
        if let Some(control) = self.control.borrow().as_ref() {
            let mut s = control.state.borrow_mut();
            s.limits.max_work = s.limits.max_work.min(options.max_steps);
            s.limits.max_depth = s.limits.max_depth.min(options.max_depth);
            return None;
        }
        let config = self.controls.clone()?;
        let mut limits = config.limits.clone();
        limits.max_work = limits.max_work.min(options.max_steps);
        limits.max_depth = limits.max_depth.min(options.max_depth);
        let control = Rc::new(EvaluationControl {
            config,
            state: RefCell::new(State {
                limits,
                usage: ControlUsage::default(),
                until_poll: 0,
                error: None,
            }),
        });
        self.last_control = Some(control.clone());
        *self.control.borrow_mut() = Some(control);
        Some(ControlScope(self.control.clone()))
    }

    pub(crate) fn control_checkpoint(&self) -> Result<()> {
        let control = self.control.borrow().clone();
        if let Some(control) = control {
            if self.cancelled.load(Ordering::Relaxed) {
                return Err(control.fail(Error::new("Cancelled", "Evaluation cancelled")));
            }
            control.work()?;
        }
        Ok(())
    }

    pub(crate) fn controls_active(&self) -> bool {
        self.control.borrow().is_some()
    }

    pub(crate) fn control_limit(&self, message: &'static str) -> Error {
        let error = Error::new("LimitError", message);
        self.control
            .borrow()
            .as_ref()
            .map_or(error.clone(), |c| c.fail(error))
    }

    pub(super) fn control_depth(&self, options: &EvalOptions) -> Result<()> {
        if let Some(control) = self.control.borrow().as_ref() {
            let mut s = control.state.borrow_mut();
            s.limits.max_work = s.limits.max_work.min(options.max_steps);
            s.limits.max_depth = s.limits.max_depth.min(options.max_depth);
            if s.usage.work > s.limits.max_work {
                drop(s);
                return Err(
                    control.fail(Error::new("LimitError", "Evaluation work limit exceeded"))
                );
            }
            if self.depth.get() >= s.limits.max_depth {
                drop(s);
                return Err(control.fail(Error::new(
                    "LimitError",
                    "Evaluation nesting limit exceeded",
                )));
            }
        }
        Ok(())
    }

    /// Reserve accounted payload bytes BEFORE allocating host intermediates.
    /// No refund is made. Outside a controlled evaluation this is a no-op.
    pub fn charge_intermediate(&self, bytes: usize) -> Result<()> {
        self.charge_size(Some(bytes))
    }

    pub(crate) fn charge_size(&self, bytes: Option<usize>) -> Result<()> {
        if let Some(control) = self.control.borrow().as_ref() {
            control.charge(bytes)?;
        }
        Ok(())
    }

    pub(crate) fn charge_items<T>(&self, count: usize) -> Result<()> {
        self.charge_size(count.checked_mul(std::mem::size_of::<T>()))
    }

    pub(crate) fn charge_value(&self, value: &Value) -> Result<()> {
        self.charge_items::<Value>(1)?;
        self.charge_owned_payload(value)
    }

    pub(crate) fn charge_owned_payload(&self, value: &Value) -> Result<()> {
        match value {
            Value::String(s) => self.charge_intermediate(s.len()),
            Value::Utf16(s) => self.charge_items::<u16>(s.len()),
            _ => Ok(()),
        }
    }

    pub(crate) fn checked_string_from_utf16(&self, units: Vec<u16>) -> Result<Value> {
        // UTF-8 needs at most three bytes per UTF-16 code unit. The original
        // units are retained for lone surrogates, as in the uncontrolled path.
        self.charge_size(units.len().checked_mul(3))?;
        Ok(self.string_from_utf16(units))
    }

    pub(crate) fn copy_units_value(&self, units: &[u16]) -> Result<Value> {
        self.charge_items::<u16>(units.len())?;
        self.checked_string_from_utf16(units.to_vec())
    }

    pub(crate) fn append_units(&self, out: &mut Vec<u16>, units: &[u16]) -> Result<()> {
        self.charge_items::<u16>(units.len())?;
        out.extend_from_slice(units);
        Ok(())
    }

    pub(crate) fn checked_to_utf16(&self, value: &Value) -> Result<Vec<u16>> {
        if !self.controls_active() {
            return Ok(self.to_utf16(value));
        }
        fn append(
            rt: &Runtime,
            value: &Value,
            out: &mut Vec<u16>,
            seen: &mut Vec<usize>,
        ) -> Result<()> {
            rt.control_checkpoint()?;
            match value {
                Value::String(s) => {
                    // Count/encode in bounded chunks; no full temporary string.
                    for c in s.chars() {
                        rt.control_checkpoint()?;
                        rt.append_units(out, c.encode_utf16(&mut [0; 2]))?;
                    }
                }
                Value::Utf16(s) => {
                    for chunk in s.chunks(1024) {
                        rt.control_checkpoint()?;
                        rt.append_units(out, chunk)?;
                    }
                }
                Value::Array(id) => {
                    if seen.contains(id) {
                        return Ok(());
                    }
                    if seen.len() >= 256 {
                        return Err(rt.control.borrow().as_ref().unwrap().fail(Error::new(
                            "LimitError",
                            "String conversion nesting limit exceeded",
                        )));
                    }
                    seen.push(*id);
                    for (i, item) in rt.array_values(value)?.iter().enumerate() {
                        if i != 0 {
                            rt.append_units(out, &[44])?;
                        }
                        if !item.is_nullish() {
                            append(rt, item, out, seen)?;
                        }
                    }
                    seen.pop();
                }
                _ => append(rt, &Value::String(rt.to_string(value)), out, seen)?,
            }
            Ok(())
        }
        let mut out = Vec::new();
        append(self, value, &mut out, &mut Vec::new())?;
        Ok(out)
    }

    pub(crate) fn checked_from_json(&mut self, json: &crate::Ast) -> Result<Value> {
        fn charge(rt: &Runtime, json: &crate::Ast, depth: usize) -> Result<()> {
            rt.control_checkpoint()?;
            rt.charge_items::<Value>(1)?;
            if depth >= 256 {
                return Err(rt.control.borrow().as_ref().unwrap().fail(Error::new(
                    "LimitError",
                    "Value conversion nesting limit exceeded",
                )));
            }
            match json {
                crate::Ast::String(s) => rt.charge_intermediate(s.len())?,
                crate::Ast::Array(values) => {
                    for v in values {
                        charge(rt, v, depth + 1)?;
                    }
                }
                crate::Ast::Object(values) => {
                    for (key, v) in values {
                        rt.charge_intermediate(key.len())?;
                        charge(rt, v, depth + 1)?;
                    }
                }
                _ => (),
            }
            Ok(())
        }
        if self.controls_active() {
            charge(self, json, 0)?;
        }
        Ok(self.from_json(json))
    }
}
