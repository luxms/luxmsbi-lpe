use crate::{Error, Result};

// Internal code units preserve JS offsets and legacy matching. Public strings remain UTF-8.
pub(crate) struct RegExp {
    engine: regress::Regex,
    unicode: bool,
    pub global: bool,
    pub indices: bool,
    sticky: bool,
}

impl RegExp {
    pub fn new(pattern: &str, flags: &str) -> Result<Self> {
        Self::from_utf16(&pattern.encode_utf16().collect::<Vec<_>>(), flags)
    }

    pub fn from_utf16(pattern: &[u16], flags: &str) -> Result<Self> {
        let mut seen = String::new();
        for flag in flags.chars() {
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
            ..regress::Flags::from(flags)
        };
        let engine = if unicode {
            regress::Regex::from_unicode(
                char::decode_utf16(pattern.iter().copied()).map(|c| match c {
                    Ok(c) => u32::from(c),
                    Err(e) => u32::from(e.unpaired_surrogate()),
                }),
                options,
            )
        } else {
            regress::Regex::from_unicode(pattern.iter().copied().map(u32::from), options)
        }
        .map_err(|e| Error::new("SyntaxError", e.to_string()))?;
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

    pub fn is_match(&self, text: &str) -> bool {
        self.find(&text.encode_utf16().collect::<Vec<_>>(), 0)
            .is_some()
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
