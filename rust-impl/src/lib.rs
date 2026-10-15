//! Host-independent LPE parser and interpreter. No JavaScript engine is used.
mod builtins;
mod collections;
mod datetime;
pub mod deparser;
pub mod parser;
mod regexp;
pub mod runtime;
mod specials;
pub mod value;

pub use deparser::deparse;
pub use parser::parse;
pub use runtime::{
    ControlUsage, EnvId, EvalOptions, Runtime, RuntimeControls, RuntimeLimits, StreamContext,
    StreamResolver, StreamStats, StreamSubscription,
};
pub use value::Value;
pub type Ast = serde_json::Value;
pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Clone)]
pub struct Error {
    pub kind: &'static str,
    pub message: String,
    pub value: Option<Value>,
    pub is_async: bool,
}

impl Error {
    pub fn new(kind: &'static str, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
            value: None,
            is_async: false,
        }
    }
    pub fn with_value(kind: &'static str, value: Value) -> Self {
        Self {
            kind,
            message: kind.to_owned(),
            value: Some(value),
            is_async: false,
        }
    }
}
impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.kind, self.message)
    }
}
impl std::error::Error for Error {}
