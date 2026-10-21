//! Portable data/call rules of the JavaScript 1.8 safe evaluator.
use crate::{Error, Result, Runtime, Value};

pub(crate) fn error(message: impl std::fmt::Display) -> Error {
    Error::new("LPESecurityError", format!("LPE security: {message}"))
}

pub(crate) fn key(key: &str) -> Result<()> {
    if matches!(
        key,
        "constructor"
            | "prototype"
            | "__proto__"
            | "caller"
            | "callee"
            | "arguments"
            | "__defineGetter__"
            | "__defineSetter__"
            | "__lookupGetter__"
            | "__lookupSetter__"
    ) {
        return Err(error(format!("Forbidden property: {key}")));
    }
    Ok(())
}

impl Runtime {
    pub(crate) fn validate_value(&self, value: &Value) -> Result<()> {
        if matches!(value, Value::Object(_) | Value::Array(_)) {
            let then = self.get(value, "then");
            if matches!(then, Value::Special(_))
                || matches!(then, Value::Function(id) if self.is_special_function(id))
            {
                return Err(error("Special forms cannot be used as then callbacks"));
            }
        }
        Ok(())
    }

    pub(crate) fn safe_value(&self, value: Value) -> Result<Value> {
        self.validate_value(&value)?;
        Ok(value)
    }
    pub(crate) fn safe_key(&self, value: &Value) -> Result<String> {
        if !matches!(value, Value::String(_) | Value::Utf16(_) | Value::Number(_)) {
            return Err(error("Property keys must be strings or numbers"));
        }
        let name = match value {
            Value::String(s) => s.clone(),
            Value::Utf16(s) => String::from_utf16(s).map_err(|_| {
                Error::new(
                    "UnsupportedFeature",
                    "Object keys containing unpaired UTF-16 surrogates are not supported",
                )
            })?,
            _ => self.to_string(value),
        };
        key(&name)?;
        Ok(name)
    }

    pub(crate) fn safe_get(&self, value: &Value, name: &str) -> Result<Value> {
        key(name)?;
        if value.is_callable() && !matches!(name, "name" | "length" | "lpeName") {
            return Err(error("Function internals are not accessible"));
        }
        if self.is_json_object(value) && !matches!(name, "parse" | "stringify") {
            return Err(error("Host object internals are not accessible"));
        }
        self.safe_value(self.get(value, name))
    }

    pub(crate) fn safe_keys(&self, value: &Value) -> Result<Vec<String>> {
        if value.is_callable() {
            return Err(error("Function internals are not accessible"));
        }
        let keys = self.keys(value);
        for name in &keys {
            key(name)?;
        }
        Ok(keys)
    }

    pub(crate) fn safe_get_in(&self, mut value: Value, path: &[Value]) -> Result<Value> {
        // Validate the whole path, including segments after a missing value.
        let keys = path
            .iter()
            .map(|v| self.safe_key(v))
            .collect::<Result<Vec<_>>>()?;
        for name in keys {
            if value.is_nullish() {
                return Ok(Value::Undefined);
            }
            value = self.safe_get(&value, &name)?;
        }
        Ok(value)
    }
}
