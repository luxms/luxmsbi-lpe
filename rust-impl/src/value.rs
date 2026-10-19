/// Compound values are arena handles owned by a Runtime, avoiding Rc cycles.
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Undefined,
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Utf16(Vec<u16>),
    Array(usize),
    Object(usize),
    Function(usize),
    Builtin(String),
    Special(String),
    Date(i64),
    Promise(usize),
    Stream(usize),
}

impl Value {
    pub(crate) fn is_heap_reference(&self) -> bool {
        matches!(
            self,
            Self::Array(_)
                | Self::Object(_)
                | Self::Function(_)
                | Self::Promise(_)
                | Self::Stream(_)
        )
    }
    pub fn truthy(&self) -> bool {
        match self {
            Self::Undefined | Self::Null => false,
            Self::Bool(b) => *b,
            Self::Number(n) => *n != 0.0 && !n.is_nan(),
            Self::String(s) => !s.is_empty(),
            Self::Utf16(s) => !s.is_empty(),
            _ => true,
        }
    }
    pub fn is_nullish(&self) -> bool {
        matches!(self, Self::Undefined | Self::Null)
    }
    pub fn is_callable(&self) -> bool {
        matches!(
            self,
            Self::Function(_) | Self::Builtin(_) | Self::Special(_)
        )
    }
    pub fn type_name(&self) -> &'static str {
        match self {
            Self::Undefined => "undefined",
            Self::Null => "object",
            Self::Bool(_) => "boolean",
            Self::Number(_) => "number",
            Self::String(_) | Self::Utf16(_) => "string",
            Self::Array(_)
            | Self::Object(_)
            | Self::Date(_)
            | Self::Promise(_)
            | Self::Stream(_) => "object",
            Self::Function(_) | Self::Builtin(_) | Self::Special(_) => "function",
        }
    }
}
