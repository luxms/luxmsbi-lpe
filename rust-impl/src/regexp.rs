use crate::{Error, Result, Runtime};
use std::cell::RefCell;

// Bound compiler input in controlled mode. Engine IR/property expansion and
// allocator overhead are not represented by the intermediate-byte counter.
const MAX_CONTROLLED_PATTERN_UNITS: usize = 4096;

fn compile(
    rt: &Runtime,
    pattern: impl Iterator<Item = u32> + Clone,
    flags: regress::Flags,
) -> Result<regress::Regex> {
    if !rt.controls_active() {
        return regress::Regex::from_unicode(pattern, flags)
            .map_err(|e| Error::new("SyntaxError", e.to_string()));
    }
    let error = RefCell::new(None);
    let pattern = pattern.take_while(|_| {
        if error.borrow().is_some() {
            return false;
        }
        match rt.control_checkpoint() {
            Ok(()) => true,
            Err(e) => {
                *error.borrow_mut() = Some(e);
                false
            }
        }
    });
    let result = regress::Regex::from_unicode(pattern, flags);
    if let Some(error) = error.into_inner() {
        return Err(error);
    }
    rt.control_checkpoint()?;
    result.map_err(|e| Error::new("SyntaxError", e.to_string()))
}

// Internal code units preserve JS offsets and legacy matching. Public strings remain UTF-8.
pub(crate) struct RegExp {
    engine: regress::Regex,
    unicode: bool,
    pub global: bool,
    pub indices: bool,
    sticky: bool,
}

impl RegExp {
    pub fn check_pattern(rt: &Runtime, pattern: &crate::Value) -> Result<()> {
        if rt.controls_active() {
            let length = match pattern {
                crate::Value::String(s) => s
                    .encode_utf16()
                    .take(MAX_CONTROLLED_PATTERN_UNITS + 1)
                    .count(),
                crate::Value::Utf16(s) => s.len(),
                _ => 0,
            };
            if length > MAX_CONTROLLED_PATTERN_UNITS {
                return Err(rt.control_limit("Regular expression pattern limit exceeded"));
            }
        }
        Ok(())
    }

    pub fn new(rt: &Runtime, pattern: &str, flags: &str) -> Result<Self> {
        if rt.controls_active() && pattern.len() > MAX_CONTROLLED_PATTERN_UNITS * 3 {
            return Err(rt.control_limit("Regular expression pattern limit exceeded"));
        }
        rt.charge_items::<u16>(pattern.encode_utf16().count())?;
        Self::from_utf16(rt, &pattern.encode_utf16().collect::<Vec<_>>(), flags)
    }

    pub fn from_utf16(rt: &Runtime, pattern: &[u16], flags: &str) -> Result<Self> {
        if rt.controls_active() && pattern.len() > MAX_CONTROLLED_PATTERN_UNITS {
            return Err(rt.control_limit("Regular expression pattern limit exceeded"));
        }
        rt.control_checkpoint()?;
        let mut seen = String::new();
        for flag in flags.chars() {
            rt.control_checkpoint()?;
            if !"dgimsuvy".contains(flag) || seen.contains(flag) {
                return Err(Error::new(
                    "SyntaxError",
                    format!("Invalid regular expression flags: {flags}"),
                ));
            }
            seen.push(flag);
        }
        if flags.contains('u') && flags.contains('v') {
            return Err(Error::new(
                "SyntaxError",
                "Regular expression flags u and v are mutually exclusive",
            ));
        }
        let unicode = flags.contains('u') || flags.contains('v');
        let options = regress::Flags {
            unicode,
            // Parsing polls its input iterator; disable the unpolled optimizer
            // only in controlled mode. Emission still uses bounded input.
            no_opt: rt.controls_active(),
            ..regress::Flags::from(flags)
        };
        let engine = if unicode {
            compile(
                rt,
                char::decode_utf16(pattern.iter().copied()).map(|c| match c {
                    Ok(c) => u32::from(c),
                    Err(e) => u32::from(e.unpaired_surrogate()),
                }),
                options,
            )
        } else {
            compile(rt, pattern.iter().copied().map(u32::from), options)
        }?;
        Ok(Self {
            engine,
            unicode,
            global: flags.contains('g'),
            indices: flags.contains('d'),
            sticky: flags.contains('y'),
        })
    }

    pub fn find(&self, text: &[u16], start: usize) -> Option<regress::Match> {
        let found = if self.unicode {
            self.engine.find_from_utf16(text, start).next()
        } else {
            self.engine.find_from_ucs2(text, start).next()
        }?;
        (!self.sticky || found.start() == start).then_some(found)
    }

    pub fn find_controlled(
        &self,
        rt: &Runtime,
        text: &[u16],
        start: usize,
    ) -> Result<Option<regress::Match>> {
        if !rt.controls_active() {
            return Ok(self.find(text, start));
        }
        let found = if self.unicode {
            self.engine
                .find_from_utf16_with_control(text, start, || rt.control_checkpoint())?
        } else {
            self.engine
                .find_from_ucs2_with_control(text, start, || rt.control_checkpoint())?
        };
        Ok(found.filter(|found| !self.sticky || found.start() == start))
    }

    pub fn is_match(&self, rt: &Runtime, text: &str) -> Result<bool> {
        rt.charge_items::<u16>(text.encode_utf16().count())?;
        let mut units = Vec::new();
        for c in text.chars() {
            rt.control_checkpoint()?;
            units.extend_from_slice(c.encode_utf16(&mut [0; 2]));
        }
        Ok(self.find_controlled(rt, &units, 0)?.is_some())
    }

    pub fn advance_index(&self, text: &[u16], index: usize) -> usize {
        if self.unicode
            && text
                .get(index)
                .is_some_and(|c| (0xd800..=0xdbff).contains(c))
            && text
                .get(index + 1)
                .is_some_and(|c| (0xdc00..=0xdfff).contains(c))
        {
            index + 2
        } else {
            index + 1
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{RuntimeControls, RuntimeLimits, Value};
    use futures::FutureExt;
    use std::{cell::Cell, num::NonZeroUsize, rc::Rc};

    #[test]
    fn cancellation_is_observed_during_compiler_input_consumption() {
        let armed = Rc::new(Cell::new(false));
        let calls = Rc::new(Cell::new(0));
        let flag = armed.clone();
        let count = calls.clone();
        let mut rt = Runtime::new();
        rt.set_controls(Some(
            RuntimeControls::new(RuntimeLimits::default()).with_interrupt_hook(
                NonZeroUsize::new(1).unwrap(),
                move || {
                    if flag.get() {
                        count.set(count.get() + 1);
                        if count.get() == 50 {
                            return Err(Error::new("Cancelled", "compile input"));
                        }
                    }
                    Ok(())
                },
            ),
        ))
        .unwrap();
        rt.register_special("compile", move |rt, _, _, _| {
            armed.set(true);
            async move {
                RegExp::new(rt, &"a".repeat(1000), "")?;
                Ok(Value::Null)
            }
            .boxed_local()
        });
        let error = rt.eval("compile()").unwrap_err();
        assert_eq!(error.kind, "Cancelled");
        assert_eq!(error.message, "compile input");
        assert_eq!(calls.get(), 50);
    }
}
