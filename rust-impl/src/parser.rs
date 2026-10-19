//! A bounded lexer and Pratt parser for the LPE source grammar.
use crate::{Error, Result};
use serde_json::{json, Value};
use std::cell::RefCell;

const MAX_SOURCE: usize = 1_048_576;
const MAX_TOKENS: usize = 100_000;
const MAX_DEPTH: usize = 96;

fn syntax(message: impl Into<String>) -> Error {
    Error::new("SyntaxError", message)
}

fn undefined() -> Value {
    json!({"$lpe": "undefined"})
}

/// An opt-in parse failure retaining the ordinary parser error unchanged.
#[derive(Debug, Clone)]
pub struct ParseError {
    pub error: Error,
    /// JS-shaped token diagnostic, when a parser token/node caused the failure.
    /// Lexer and resource-limit errors may have no diagnostic. Only direct
    /// grouping/tuple/array elements are included in `first`, not a full JS tree.
    pub diagnostic: Option<Box<Value>>,
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.error.fmt(f)
    }
}

impl std::error::Error for ParseError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Some(&self.error)
    }
}

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Name,
    Number,
    String,
    Column,
    Operator,
    Lf,
    End,
}

#[derive(Clone)]
struct Token {
    kind: Kind,
    text: String,
    ast: Value,
    offset: usize,
    end: usize,
    logical: bool,
}

impl Token {
    fn take(&mut self) -> Self {
        Self {
            kind: self.kind,
            text: std::mem::take(&mut self.text),
            ast: std::mem::take(&mut self.ast),
            offset: self.offset,
            end: self.end,
            logical: self.logical,
        }
    }
    fn diagnostic(&self, source: &str, arity: Option<&str>) -> Value {
        if self.kind == Kind::End {
            return json!({"value": "(end)"});
        }
        // Lexer indices count Rust chars; JS token offsets and carets count
        // UTF-16 units. Prefixes are stripped by the lexer, not from JS's src.
        let lexical_source = source.strip_prefix("lpe:").unwrap_or(source);
        let lexical_source = lexical_source
            .strip_prefix('\u{26a1}')
            .unwrap_or(lexical_source);
        let from: usize = lexical_source
            .chars()
            .take(self.offset)
            .map(char::len_utf16)
            .sum();
        let to = from
            + lexical_source
                .chars()
                .skip(self.offset)
                .take(self.end - self.offset)
                .map(char::len_utf16)
                .sum::<usize>();
        let mut crs = String::new();
        for (i, unit) in source.encode_utf16().enumerate() {
            if (from..to).contains(&i) {
                crs.push('^');
            } else if unit == u16::from(b'\n') {
                crs.push_str("--");
            } else {
                crs.push('-');
            }
        }
        let value = match self.kind {
            Kind::Number | Kind::Column => self.ast.clone(),
            Kind::String if self.ast.as_array().is_some_and(|a| a.len() == 2) => {
                self.ast[1].clone()
            }
            Kind::String => self.ast.clone(),
            _ => Value::String(self.text.clone()),
        };
        let arity = arity.unwrap_or(match self.kind {
            Kind::Name if matches!(self.text.as_str(), "true" | "false" | "null") => "literal",
            Kind::Name => "name",
            Kind::Number | Kind::String | Kind::Column => "literal",
            Kind::Lf => "LF",
            _ => "operator",
        });
        json!({"src": source, "crs": crs, "from": from, "to": to, "value": value, "arity": arity})
    }
}

fn letter(c: char) -> bool {
    // The reference scans UTF-16 code units, so astral letters are not identifiers.
    if c.is_ascii() {
        c.is_ascii_alphabetic()
    } else {
        c <= '\u{ffff}' && c.to_lowercase().ne(c.to_uppercase())
    }
}

struct Lexer {
    chars: Vec<char>,
    pos: usize,
}

impl Lexer {
    fn peek(&self) -> Option<char> {
        self.chars.get(self.pos).copied()
    }
    fn at(&self, offset: usize) -> Option<char> {
        self.chars.get(self.pos + offset).copied()
    }

    fn string(&mut self, raw: bool) -> Result<String> {
        let opener = self.peek().unwrap();
        let closer = if opener == '[' { ']' } else { opener };
        self.pos += 1;
        let mut units = Vec::new();
        loop {
            let mut c = self.peek().ok_or_else(|| syntax("Unterminated string."))?;
            if c < ' ' {
                return Err(syntax("Control character or newline in string."));
            }
            self.pos += 1;
            if c == closer {
                break;
            }
            if c == '\\' && opener != '[' && !raw {
                c = self.peek().ok_or_else(|| syntax("Unterminated string."))?;
                self.pos += 1;
                c = match c {
                    'b' => '\u{0008}',
                    'f' => '\u{000c}',
                    'n' => '\n',
                    'r' => '\r',
                    't' => '\t',
                    'u' => {
                        // JS parseInt accepts a hexadecimal prefix of the next four characters.
                        let raw: String = self.chars.iter().skip(self.pos).take(4).collect();
                        let raw =
                            raw.trim_start_matches(|c: char| c.is_whitespace() || c == '\u{feff}');
                        let negative = raw.starts_with('-');
                        let raw = raw.strip_prefix(['+', '-']).unwrap_or(raw);
                        let raw = raw
                            .strip_prefix("0x")
                            .or_else(|| raw.strip_prefix("0X"))
                            .unwrap_or(raw);
                        let mut value = 0u16;
                        let mut digits = 0;
                        for ch in raw.chars() {
                            if let Some(digit) = ch.to_digit(16) {
                                value = value * 16 + digit as u16;
                                digits += 1;
                            } else {
                                break;
                            }
                        }
                        if digits == 0 || (negative && value != 0) {
                            return Err(syntax("Invalid Unicode escape."));
                        }
                        self.pos = self.pos.saturating_add(4);
                        units.push(value);
                        continue;
                    }
                    other => other,
                };
            }
            units.extend(c.encode_utf16(&mut [0; 2]).iter().copied());
        }
        String::from_utf16(&units).map_err(|_| {
            syntax("Invalid Unicode string: unpaired surrogate escape; UTF-8 requires a valid Unicode scalar value.")
        })
    }
}

fn tokenize(source: &str, square: bool, legacy_line_breaks: bool) -> Result<Vec<Token>> {
    if source.len() > MAX_SOURCE {
        return Err(syntax("Source size limit exceeded."));
    }
    let source = source.strip_prefix("lpe:").unwrap_or(source);
    let source = source.strip_prefix('\u{26a1}').unwrap_or(source);
    let mut lexer = Lexer {
        chars: source.chars().collect(),
        pos: 0,
    };
    let mut tokens = Vec::new();
    let mut nesting = 0usize;
    while let Some(c) = lexer.peek() {
        let offset = lexer.pos;
        let mut text = String::new();
        let mut ast = Value::Null;
        let kind;
        if c == '\n' {
            lexer.pos += 1;
            if nesting != 0 {
                continue;
            }
            kind = Kind::Lf;
            text.push(c);
        } else if c <= ' ' {
            lexer.pos += 1;
            continue;
        } else if letter(c) || c == '_' || c == '$' {
            while lexer
                .peek()
                .is_some_and(|ch| letter(ch) || ch.is_ascii_digit() || ch == '_' || ch == '$')
            {
                text.push(lexer.peek().unwrap());
                lexer.pos += 1;
            }
            if matches!(lexer.peek(), Some('\'' | '"')) {
                let quote = lexer.peek().unwrap().to_string();
                ast = json!([quote, lexer.string(text == "r")?, text]);
                kind = Kind::String;
                text.clear();
            } else {
                kind = Kind::Name;
                ast = Value::String(text.clone());
            }
        } else if c.is_ascii_digit() {
            while lexer.peek().is_some_and(|ch| ch.is_ascii_digit()) {
                lexer.pos += 1;
            }
            if lexer.peek() == Some('.') {
                lexer.pos += 1;
                while lexer.peek().is_some_and(|ch| ch.is_ascii_digit()) {
                    lexer.pos += 1;
                }
            }
            if matches!(lexer.peek(), Some('e' | 'E')) {
                lexer.pos += 1;
                if matches!(lexer.peek(), Some('+' | '-')) {
                    lexer.pos += 1;
                }
                if !lexer.peek().is_some_and(|ch| ch.is_ascii_digit()) {
                    return Err(syntax("Bad exponent."));
                }
                while lexer.peek().is_some_and(|ch| ch.is_ascii_digit()) {
                    lexer.pos += 1;
                }
            }
            if lexer.peek().is_some_and(|ch| ch.is_ascii_lowercase()) {
                return Err(syntax("Bad number."));
            }
            text = lexer.chars[offset..lexer.pos].iter().collect();
            let n: f64 = text.parse().map_err(|_| syntax("Bad number."))?;
            if !n.is_finite() {
                return Err(syntax("Bad number."));
            }
            // Preserve the JSON representation JS chooses even above the safe integer range.
            ast = serde_json::from_str(ryu_js::Buffer::new().format(n))
                .map_err(|_| syntax("Bad number."))?;
            kind = Kind::Number;
        } else if c == '\'' || c == '"' {
            ast = json!([c.to_string(), lexer.string(false)?]);
            kind = Kind::String;
        } else if square && c == '[' {
            ast = json!(["[]", lexer.string(false)?]);
            kind = Kind::Column;
        } else if (c == '/' && lexer.at(1) == Some('/'))
            || (c == '-'
                && lexer.at(1) == Some('-')
                && (offset == 0 || lexer.chars[offset - 1] <= ' '))
        {
            while lexer.peek().is_some_and(|ch| ch != '\n' && ch != '\r') {
                lexer.pos += 1;
            }
            continue;
        } else if c == '/' && lexer.at(1) == Some('*') {
            lexer.pos += 2;
            while lexer.peek().is_some() {
                if lexer.peek() == Some('*') && lexer.at(1) == Some('/') {
                    lexer.pos += 2;
                    break;
                }
                lexer.pos += 1;
            }
            continue;
        } else {
            kind = Kind::Operator;
            let sequence = ["===", "<-", "<=", "<<", "<>", "==", "=>", "~>"]
                .into_iter()
                .find(|op| {
                    lexer.chars[lexer.pos..]
                        .iter()
                        .copied()
                        .take(op.len())
                        .eq(op.chars())
                });
            if let Some(op) = sequence {
                text.push_str(op);
                lexer.pos += op.len();
            } else if ">!+-*&|/%^:.".contains(c) {
                text.push(c);
                lexer.pos += 1;
                while lexer.peek().is_some_and(|ch| "=<>&|:.".contains(ch)) {
                    text.push(lexer.peek().unwrap());
                    lexer.pos += 1;
                }
            } else {
                if "([{".contains(c) {
                    nesting += 1;
                }
                if ")]}".contains(c) {
                    nesting = nesting.saturating_sub(1);
                }
                text.push(c);
                lexer.pos += 1;
            }
        }
        tokens.push(Token {
            kind,
            text,
            ast,
            offset,
            end: lexer.pos,
            logical: true,
        });
        if tokens.len() > MAX_TOKENS {
            return Err(syntax("Token limit exceeded."));
        }
    }
    // Legacy JS joins after a dot, but a newline before it starts a statement.
    let mut filtered: Vec<Token> = Vec::with_capacity(tokens.len() + 1);
    let mut i = 0;
    while i < tokens.len() {
        if tokens[i].kind == Kind::Lf {
            let start = i;
            while i < tokens.len() && tokens[i].kind == Kind::Lf {
                i += 1;
            }
            if filtered.last().is_some_and(|t| t.text == ".")
                || (!legacy_line_breaks && tokens.get(i).is_some_and(|t| t.text == "."))
            {
                continue;
            }
            for token in &mut tokens[start..i] {
                filtered.push(token.take());
            }
        } else {
            filtered.push(tokens[i].take());
            i += 1;
        }
    }
    filtered.push(Token {
        kind: Kind::End,
        text: String::new(),
        ast: Value::Null,
        offset: source.len(),
        end: source.len(),
        logical: true,
    });
    Ok(filtered)
}

fn canonical(op: &str) -> &str {
    match op {
        "&&" | "\u{2227}" => "and",
        "||" | "\u{2228}" => "or",
        "\u{2371}" => "nor",
        "\u{2372}" => "nand",
        "\u{22a3}" => "car",
        "\u{22a2}" => "cdr",
        "!" | "\u{00ac}" => "not",
        "\u{2260}" => "!=",
        "\u{2264}" => "<=",
        "\u{2265}" => ">=",
        other => other,
    }
}

fn binding(op: &str) -> u8 {
    match canonical(op) {
        ":" => 2,
        ":=" | "<-" | "?" => 20,
        "=>" => 21,
        "and" | "or" | "nor" | "nand" | "car" | "cdr" | "\u{2374}" | "in" | "is" => 30,
        "~" | "!~" | "=" | "==" | "===" | "!==" | "!=" | "<" | "<=" | ">" | ">=" | "<>" | "@" => 40,
        "+" | "-" | "#" => 50,
        "*" | "/" => 60,
        "." | ".." | "->" | "->>" | "~>" => 70,
        "(" => 80,
        "::" => 90,
        _ => 0,
    }
}

#[derive(Clone, Copy, PartialEq)]
enum Arity {
    Name,
    Literal,
    Unary,
    Binary,
}

impl Arity {
    fn name(self) -> &'static str {
        match self {
            Self::Name => "name",
            Self::Literal => "literal",
            Self::Unary => "unary",
            Self::Binary => "binary",
        }
    }
}

#[derive(Clone)]
struct NodeDiagnostic {
    token: Token,
    arity: Arity,
}

struct Node {
    ast: Value,
    value: String,
    arity: Arity,
    depth: usize,
    diagnostic: Option<Box<NodeDiagnostic>>,
    first_diagnostics: Option<Box<[Option<NodeDiagnostic>]>>,
}

impl Node {
    fn leaf(ast: Value, value: String, arity: Arity) -> Self {
        let depth = if ast.is_array() { 1 } else { 0 };
        Self {
            ast,
            value,
            arity,
            depth,
            diagnostic: None,
            first_diagnostics: None,
        }
    }

    fn form(op: &str, args: Vec<Node>, value: &str, arity: Arity) -> Result<Self> {
        let depth = args.iter().map(|n| n.depth).max().unwrap_or(0) + 1;
        if depth > MAX_DEPTH {
            return Err(syntax("AST nesting limit exceeded."));
        }
        let first_diagnostics = if matches!(op, "()" | "tuple" | "[" | "vector")
            && args.iter().any(|n| n.diagnostic.is_some())
        {
            Some(
                args.iter()
                    .map(|n| n.diagnostic.as_deref().cloned())
                    .collect(),
            )
        } else {
            None
        };
        let mut ast = Vec::with_capacity(args.len() + 1);
        ast.push(Value::String(op.into()));
        ast.extend(args.into_iter().map(|n| n.ast));
        Ok(Self {
            ast: Value::Array(ast),
            value: value.into(),
            arity,
            depth,
            diagnostic: None,
            first_diagnostics,
        })
    }
}

struct Parser<'a> {
    tokens: Vec<Token>,
    pos: usize,
    logical: bool,
    depth: usize,
    diagnostic_source: Option<&'a str>,
    diagnostic: RefCell<Option<Value>>,
}

impl Parser<'_> {
    fn current(&self) -> &Token {
        &self.tokens[self.pos]
    }
    fn is(&self, text: &str) -> bool {
        self.current().text == text
    }
    fn error(&self, message: &str) -> Error {
        self.record_diagnostic(message, self.current(), None, None);
        syntax(format!(
            "{} At character {}.",
            message,
            self.current().offset
        ))
    }

    fn record_diagnostic(
        &self,
        message: &str,
        token: &Token,
        arity: Option<Arity>,
        first: Option<&[Option<NodeDiagnostic>]>,
    ) {
        let Some(source) = self.diagnostic_source else {
            return;
        };
        let mut diagnostic = self.diagnostic.borrow_mut();
        if diagnostic.is_some() {
            return;
        }
        let mut result = json!({"message": message});
        result.as_object_mut().unwrap().extend(
            token
                .diagnostic(source, arity.map(Arity::name))
                .as_object()
                .unwrap()
                .clone(),
        );
        if let Some(first) = first {
            result["first"] = Value::Array(
                first
                    .iter()
                    .map(|child| {
                        child.as_ref().map_or(Value::Null, |child| {
                            child.token.diagnostic(source, Some(child.arity.name()))
                        })
                    })
                    .collect(),
            );
        }
        *diagnostic = Some(result);
    }

    fn token_error(&self, message: &str, diagnostic_message: &str, token: &Token) -> Error {
        self.record_diagnostic(diagnostic_message, token, None, None);
        self.error(message)
    }

    fn node_error(&self, message: &str, node: &Node) -> Error {
        if let Some(diagnostic) = &node.diagnostic {
            self.record_diagnostic(
                message,
                &diagnostic.token,
                Some(diagnostic.arity),
                node.first_diagnostics.as_deref(),
            );
        }
        self.error(message)
    }

    fn advance(&mut self) -> Result<Token> {
        let token = self.tokens[self.pos].take();
        if self.pos + 1 < self.tokens.len() {
            self.pos += 1;
        }
        self.tokens[self.pos].logical = self.logical;
        let next = self.current();
        if next.kind == Kind::Operator
            && binding(&next.text) == 0
            && !matches!(
                next.text.as_str(),
                ";" | "," | ")" | "]" | "}" | "[" | "{" | "!" | "\u{00ac}"
            )
        {
            return Err(self.error("Unknown operator."));
        }
        Ok(token)
    }

    fn expect(&mut self, text: &str) -> Result<()> {
        if !self.is(text) {
            return Err(self.error(&format!("Expected '{}'.", text)));
        }
        self.advance()?;
        Ok(())
    }

    fn power(&self) -> u8 {
        let t = self.current();
        if t.kind == Kind::Operator
            || (t.kind == Kind::Name
                && t.logical
                && matches!(t.text.as_str(), "and" | "or" | "in" | "is"))
        {
            binding(&t.text)
        } else {
            0
        }
    }

    fn expression(&mut self, rbp: u8) -> Result<Node> {
        if self.depth >= MAX_DEPTH {
            return Err(self.error("Parser nesting limit exceeded."));
        }
        self.depth += 1;
        let result = self.expression_inner(rbp);
        self.depth -= 1;
        result
    }

    fn expression_inner(&mut self, rbp: u8) -> Result<Node> {
        while self.current().kind == Kind::Lf {
            self.advance()?;
        }
        let token = self.advance()?;
        let origin = self.diagnostic_source.map(|_| Box::new(token.clone()));
        let mut left = self.prefix(token)?;
        if left.diagnostic.is_none() {
            left.diagnostic = origin.map(|token| {
                Box::new(NodeDiagnostic {
                    token: *token,
                    arity: left.arity,
                })
            });
        }
        while rbp < self.power() {
            let op = self.advance()?;
            left = self.infix(left, &op.text)?;
            if self.diagnostic_source.is_some() {
                left.diagnostic = Some(Box::new(NodeDiagnostic {
                    token: op,
                    arity: left.arity,
                }));
            }
        }
        Ok(left)
    }

    fn prefix(&mut self, token: Token) -> Result<Node> {
        let text = token.text.as_str();
        if token.kind == Kind::Name {
            if self.current().kind == Kind::Column {
                let mut column = self.advance()?.ast;
                column.as_array_mut().unwrap().push(token.ast);
                return Ok(Node::leaf(column, String::new(), Arity::Unary));
            }
            match text {
                "true" => return Ok(Node::leaf(json!(true), text.into(), Arity::Literal)),
                "false" => return Ok(Node::leaf(json!(false), text.into(), Arity::Literal)),
                "null" => return Ok(Node::leaf(Value::Null, text.into(), Arity::Literal)),
                "VAR" => return self.variables(),
                "RETURN" => {
                    return Err(self.token_error(
                        "RETURN without preceding VAR.",
                        "RETURN without preceding VAR.",
                        &token,
                    ))
                }
                "in" | "is" if token.logical => {
                    return Err(self.error("Undefined prefix operator."))
                }
                "not" if token.logical => {}
                _ => return Ok(Node::leaf(token.ast, token.text, Arity::Name)),
            }
        }
        if matches!(token.kind, Kind::Number | Kind::String | Kind::Column) {
            return Ok(Node::leaf(
                token.ast,
                token.text,
                if token.kind == Kind::Number {
                    Arity::Literal
                } else {
                    Arity::Unary
                },
            ));
        }
        match text {
            "+" | "-" | "#" | "@" | "!" | "\u{00ac}" | "not" => {
                let arg = self.expression(70)?;
                if text == "not" && arg.ast.get(0).and_then(Value::as_str) == Some("()") {
                    if arg.ast.as_array().unwrap().len() == 1 {
                        return Node::form("not", vec![], "(", Arity::Binary);
                    }
                    return Node::form("not", vec![arg], "(", Arity::Binary);
                }
                Node::form(canonical(text), vec![arg], text, Arity::Unary)
            }
            "." => {
                let arg = self.expression(70)?;
                if arg.value != "(" {
                    return Err(
                        self.node_error("Only functions may have dot (.) unary operator.", &arg)
                    );
                }
                Ok(arg)
            }
            "(" => {
                if self.is(")") {
                    self.advance()?;
                    return Node::form("()", vec![], "(", Arity::Binary);
                }
                if self.is(",") {
                    self.advance()?;
                    self.expect(")")?;
                    return Node::form("tuple", vec![], "(", Arity::Unary);
                }
                let mut args = vec![self.expression(0)?];
                let mut tuple = false;
                while self.is(",") {
                    tuple = true;
                    self.advance()?;
                    if self.is(")") {
                        break;
                    }
                    args.push(self.expression(0)?);
                }
                self.expect(")")?;
                Node::form(if tuple { "tuple" } else { "()" }, args, "(", Arity::Unary)
            }
            "[" | "{" => {
                let close = if text == "[" { "]" } else { "}" };
                if text == "{"
                    && self.is("=")
                    && self.tokens.get(self.pos + 1).is_some_and(|t| t.text == "}")
                {
                    self.advance()?;
                    self.expect("}")?;
                    return Node::form("hash", vec![], "{", Arity::Unary);
                }
                let mut args = Vec::new();
                if !self.is(close) {
                    loop {
                        args.push(self.expression(0)?);
                        if !self.is(",") && !(text == "{" && self.is(";")) {
                            break;
                        }
                        self.advance()?;
                    }
                }
                self.expect(close)?;
                Node::form(
                    if text == "[" { "[" } else { "vector" },
                    args,
                    text,
                    Arity::Unary,
                )
            }
            _ => Err(self.token_error("Expression expected.", "Undefined.", &token)),
        }
    }

    fn variables(&mut self) -> Result<Node> {
        let mut bindings = Vec::new();
        loop {
            if self.current().kind != Kind::Name
                || matches!(self.current().text.as_str(), "true" | "false" | "null")
            {
                return Err(self.error("Variable name expected after VAR."));
            }
            let name = self.advance()?;
            if !self.is("=") && !self.is(":=") {
                return Err(self.error("Expected '=' or ':=' after VAR name."));
            }
            self.advance()?;
            let value = self.expression(0)?;
            bindings.push(Node::form(
                "[",
                vec![Node::leaf(name.ast, name.text, Arity::Name), value],
                "[",
                Arity::Unary,
            )?);
            while self.is(";") || self.current().kind == Kind::Lf {
                self.advance()?;
            }
            if self.is("VAR") {
                self.advance()?;
                continue;
            }
            if self.is("RETURN") {
                self.advance()?;
                break;
            }
            return Err(self.error("Expected VAR or RETURN."));
        }
        let body = self.expression(0)?;
        let bindings = Node::form("[", bindings, "[", Arity::Unary)?;
        Node::form("let*", vec![bindings, body], "VAR", Arity::Binary)
    }

    fn infix(&mut self, mut left: Node, op: &str) -> Result<Node> {
        if op == "(" {
            let outer_scope = self.logical;
            let mut args = vec![left];
            if !self.is(")") {
                self.logical = false;
                loop {
                    if self.is(",") || self.is(";") {
                        args.push(Node::leaf(undefined(), String::new(), Arity::Literal));
                        self.advance()?;
                    } else if self.is(")") {
                        args.push(Node::leaf(undefined(), String::new(), Arity::Literal));
                        break;
                    } else {
                        self.logical = true;
                        args.push(self.expression(0)?);
                        self.logical = false;
                        if !self.is(",") && !self.is(";") {
                            break;
                        }
                        self.advance()?;
                    }
                }
            }
            self.logical = outer_scope;
            self.expect(")")?;
            let depth = args.iter().map(|n| n.depth).max().unwrap_or(0) + 1;
            if depth > MAX_DEPTH {
                return Err(self.error("AST nesting limit exceeded."));
            }
            return Ok(Node {
                ast: Value::Array(args.into_iter().map(|n| n.ast).collect()),
                value: "(".into(),
                arity: Arity::Binary,
                depth,
                diagnostic: None,
                first_diagnostics: None,
            });
        }
        if op == "~>" {
            if self.is("(") {
                self.advance()?;
                let key = self.expression(0)?;
                self.expect(")")?;
                return Node::form("_get_obj_meth_", vec![left, key], op, Arity::Binary);
            }
            let mut right = self.expression(70)?;
            if right.value == "(" {
                let values = right
                    .ast
                    .as_array_mut()
                    .ok_or_else(|| self.error("Named method expected."))?;
                if values.first().and_then(Value::as_str).is_none() {
                    return Err(self.error("Named method expected."));
                }
                let name = values.remove(0);
                let mut args = vec![
                    left,
                    Node::leaf(json!(["\"", name]), String::new(), Arity::Unary),
                ];
                args.extend(values.drain(..).map(|ast| Node {
                    ast,
                    value: String::new(),
                    arity: Arity::Literal,
                    depth: right.depth.saturating_sub(1),
                    diagnostic: None,
                    first_diagnostics: None,
                }));
                return Node::form("_call_obj_meth_", args, op, Arity::Binary);
            }
            if right.arity == Arity::Name {
                right.ast = json!(["\"", right.ast]);
                right.depth += 1;
            } else if !matches!(right.ast.get(0).and_then(Value::as_str), Some("\"" | "'")) {
                return Err(
                    self.error("~> expects a name, string, (expression), or named method call.")
                );
            }
            return Node::form("_get_obj_meth_", vec![left, right], op, Arity::Binary);
        }
        let left_assoc = matches!(
            op,
            "<-" | "=>" | "+" | "-" | "#" | "*" | "/" | "." | ".." | "->" | "->>"
        );
        let right = self.expression(if op == "?" {
            0
        } else {
            binding(op) - u8::from(!left_assoc)
        })?;
        if op == "?" {
            if right.value != ":" {
                return Err(self.node_error("Invalid ternary operator.", &right));
            }
            let mut parts = right.ast.as_array().unwrap().iter().skip(1).cloned();
            let yes = Node {
                ast: parts.next().unwrap(),
                value: String::new(),
                arity: Arity::Literal,
                depth: right.depth - 1,
                diagnostic: None,
                first_diagnostics: None,
            };
            let no = Node {
                ast: parts.next().unwrap(),
                value: String::new(),
                arity: Arity::Literal,
                depth: right.depth - 1,
                diagnostic: None,
                first_diagnostics: None,
            };
            return Node::form("if", vec![left, yes, no], op, Arity::Binary);
        }
        // Grow flat associative chains in place, keeping long sums and pipes linear.
        if (op == "+"
            && left.arity == Arity::Binary
            && left.ast.get(0).and_then(Value::as_str) == Some("+"))
            || (matches!(op, "." | ".." | "->" | "->>") && left.value == op)
        {
            left.depth = left.depth.max(right.depth + 1);
            if left.depth > MAX_DEPTH {
                return Err(self.error("AST nesting limit exceeded."));
            }
            left.ast.as_array_mut().unwrap().push(right.ast);
            left.value = op.into();
            return Ok(left);
        }
        Node::form(canonical(op), vec![left, right], op, Arity::Binary)
    }
}

/// Parse an LPE expression using the current logical/standard grammar rules.
pub fn parse(source: &str) -> Result<Value> {
    parse_with_options(source, &Value::Null)
}

/// `squareBrackets` selects SQL column literals. `legacyLineBreaks` preserves
/// top-level newlines before dots as statement boundaries, matching JS 1.6.7.
/// Both options default to false. Debug metadata is not a JSON AST property.
pub fn parse_with_options(source: &str, options: &Value) -> Result<Value> {
    parse_internal(source, options, false).map_err(|failure| failure.error)
}

/// Parse with opt-in JS-shaped token/caret diagnostics, preserving `Error`.
///
/// Token spans use UTF-16 indices. End-of-input has no `src`, `crs`, or span.
/// Direct grouping/tuple/array children are included in `first`; other JS child
/// fields and nested child trees are not reconstructed. Lexer/resource failures
/// without a parser token may return `diagnostic: None`.
pub fn parse_with_diagnostics(
    source: &str,
    options: &Value,
) -> std::result::Result<Value, ParseError> {
    parse_internal(source, options, true)
}

fn parse_internal(
    source: &str,
    options: &Value,
    diagnostics: bool,
) -> std::result::Result<Value, ParseError> {
    let tokens = tokenize(
        source,
        options
            .get("squareBrackets")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        options
            .get("legacyLineBreaks")
            .and_then(Value::as_bool)
            .unwrap_or(false),
    )
    .map_err(|error| ParseError {
        error,
        diagnostic: None,
    })?;
    let mut parser = Parser {
        tokens,
        pos: 0,
        logical: true,
        depth: 0,
        diagnostic_source: diagnostics.then_some(source),
        diagnostic: RefCell::new(None),
    };
    let result = parse_program(&mut parser);
    result.map_err(|error| ParseError {
        error,
        diagnostic: parser.diagnostic.into_inner().map(Box::new),
    })
}

fn parse_program(parser: &mut Parser<'_>) -> Result<Value> {
    let mut statements = Vec::new();
    while parser.current().kind != Kind::End {
        if parser.is(";") || parser.current().kind == Kind::Lf {
            parser.advance()?;
            continue;
        }
        statements.push(parser.expression(0)?);
        if parser.current().kind != Kind::End
            && !parser.is(";")
            && parser.current().kind != Kind::Lf
        {
            return Err(parser.error("Statement separator expected (';' or newline)."));
        }
    }
    match statements.len() {
        0 => Err(syntax("Empty expression.")),
        1 => Ok(statements.pop().unwrap().ast),
        _ => Ok(Node::form("begin", statements, "begin", Arity::Binary)?.ast),
    }
}
