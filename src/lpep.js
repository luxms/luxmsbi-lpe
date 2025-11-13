/**
 * LuxPath expressions parser
 *
 * VERSION: 1.0.1
 *
 * DVD: added sexpr property to the token as array to keep s-expressions.
 *      arity and first, second etc will be removed
 *
 */

// Parser for Simplified JavaScript written in Simplified JavaScript
// From Top Down Operator Precedence
// http://javascript.crockford.com/tdop/index.html
// http://crockford.com/javascript/tdop/tdop.html
// Douglas Crockford
// 2010-06-26
//////////////////////////////////////////////////
// Later hacked to parse LPE instead of JavaScript
// Dmitry Dorofeev
// 2017-01-20


/*
lbp = left binding power
rbp = right binding power
nud = null denotation
led = left denotation
std = statement denotation
*/


import { isArray } from './lisp';
import { tokenize, makeError, LPESyntaxError } from './lpel';

/**
 *
 * @param {{squareBrackets: boolean}} options
 * @returns {function(*): null|*|{sexpr: string[]}}
 */
const make_parse = function (options = {}) {
  const squareBrackets = options.squareBrackets ?? false;                           // by default - ! squareBrackets

  var m_symbol_table = {};
  var m_token;
  var m_tokens;
  var m_token_nr;
  var m_source;

  // стэк для типов выражений
  var m_expr_scope = { pop: function () {}};  // для разбора логических выражений типа (A and B or C)

  // для хранения алиасов для операций
  var m_operator_aliases = {};

  var operator_alias = function(from, to) {
    m_operator_aliases[from] = to;
  };

  var itself = function () {
    return this;
  };

  let scope = {
    find: function (n) {
      var e = this, o;
      var s = Object.create(original_symbol);
      s.nud      = itself;
      s.led      = null;
      s.lbp      = 0;
      return s;
    },
  };

  var expr_logical_scope = {
    pop: function () {
      m_expr_scope = this.parent;
    },
    parent: null,
    tp: "logical"
  };

  var expr_lpe_scope = {
    pop: function () {
      m_expr_scope = this.parent;
    },
    parent: null,
    tp: "lpe"
  };

  const new_expression_scope = function (tp) {
    const s = m_expr_scope;
    m_expr_scope = Object.create(tp === "logical" ? expr_logical_scope : expr_lpe_scope);
    m_expr_scope.parent = s;
    return m_expr_scope;
  };

  const advance = function (id) {
    var a, o, v;
    if (id && m_token.id !== id) {
      makeError(m_token, "Got " + m_token.value + " but expected '" + id + "'.");
    }
    if (m_token_nr >= m_tokens.length) {
      m_token = m_symbol_table["(end)"];
      return;
    }
    let t = m_tokens[m_token_nr];
    m_token_nr++;
    v = t.value;
    a = t.type;

    if (a === 'name') {
      if (m_tokens[m_token_nr]?.type === 'string_column') {                                         // Строки типа 'My Table'[My Column]
        o = advance();                                                                              // Берем следующий
        o.from = t.from;                                                                            // Фиксаем from, to
        t = {...t, to: o.to}
        v = o.sexpr = [...o.sexpr, v];                                                              // в v добавляется еще один аргумент

      } else if (v === 'true' || v === 'false' || v === 'null') {
        o = m_symbol_table[v];
        a = "literal";
      } else if (m_expr_scope.tp === "logical") {
        if (v === "or" || v === "and" || v === "not" || v === "in" || v === "is") {
          //a = "operator";
          o = m_symbol_table[v];
          if (!o) {
            makeError(t, "Unknown logical operator.");
          }
        } else {
          o = scope.find(v);
        }
      } else {
        o = scope.find(v);
      }
    } else if (a === "operator") {
      o = m_symbol_table[v];
      if (!o) {
        makeError(t, "Unknown operator.");
      }
    } else if (a === 'string_single') {                                                             // 'строчка' в ординарных, v = [', ...]
      o = m_symbol_table['(string_literal_single)'];
      a = 'literal';
    } else if (a === 'string_double') {                                                             // "строчка" в двойных кавычках, v = [", ...]
      o = m_symbol_table['(string_literal_double)'];
      a = 'literal';
    } else if (a === 'string_column') {                                                             // [строчка] в скобочках
      o = m_symbol_table['(string_literal_column)'];
      a = 'literal';
      v = ['[]', v];
    } else if (a === 'number') {
      o = m_symbol_table["(number_literal)"];
      a = 'literal';
    } else if (a === 'LF') {
      o = m_symbol_table['LF'];
    } else {
      makeError(t, 'Unexpected token.');
    }
    m_token = Object.create(o);
    m_token.from = t.from;
    m_token.to = t.to;
    m_token.value = v;
    m_token.arity = a;
    m_token.src = m_source;
    m_token.crs = m_source.split('').map((c, i) => i >= t.from && i < t.to ? "^" : "-").join("");
    if (a === "operator") {
      m_token.sexpr = m_operator_aliases[v];
    } else {
      m_token.sexpr = v; // by dima
    }
    return m_token;
  };

  const statement = function () {
    var n = m_token, v;

    if (n.std) {
        advance();
        //scope.reserve(n);
        return n.std();
    }
    v = expression(0);
    //if (!v.assignment && v.id !== "(") {
    /*  if (v.id !== "(" && v.id !== "name" && v.id !== "number") {
        console.log(v);
        v.error("Bad expression statement.");
    }*/
    //advance(';');
    return v;
  };

  const statements = function () {
    const program = [];                                                                             // collect statements here
    let thereWasSeparatorBefore = true;                                                             // Был ли разделитель операторов

    while (true) {
      if (m_token.id === "(end)") {
        break;
      } else if (m_token.value === ';' || m_token.value === '\n') {                                                           // skip optional ;
        thereWasSeparatorBefore = true;
        advance();
        continue;
      }
      // if (!thereWasSeparatorBefore) {                                                               //
      //   makeError(m_token, "Statement expected");
      // }

      const s = statement();
      if (s) {
        program.push(s);
        thereWasSeparatorBefore = false;
      }
    }

    return (
        program.length === 0 ?
          null :
        program.length === 1 ?
          program[0] :
          {sexpr: ['begin', ...program.map(el => el.sexpr)]});
  };

  const expression = function (rbp) {
    let t = m_token;
    advance();
    while (t.arity === 'LF') {
      t = m_token;
      advance();
    }
    let left = t.nud();
    while (rbp < m_token.lbp) {
      t = m_token;
      advance();
      left = t.led(left);
    }
    return left;
  };

  const original_symbol = {
    nud: function () {
      makeError(this, "Undefined.");
    },
    led: function (left) {
      makeError(this, "Missing operator.");
    }
  };

  const symbol = function (id, bp) {
    let s = m_symbol_table[id];
    bp = bp || 0;
    if (s) {
      if (bp >= s.lbp) {
        s.lbp = bp;
      }
    } else {
      s = Object.create(original_symbol);
      s.id = s.value = id;
      s.lbp = bp;
      m_symbol_table[id] = s;
    }
    operator_alias(id, id);
    return s;
  };

  var infix = function (id, bp, led) {
    var s = symbol(id, bp);
    s.led = led || function (left) {
      this.first = left;
      var right = expression(bp);
      this.second = right;
      this.arity = "binary";
      this.sexpr = [this.sexpr, left.sexpr, right.sexpr];
      return this;
    };
    return s;
  };

  // infix operators are left associative.
  // We can also make right associative operators, such as short-circuiting logical operators,
  // by reducing the right binding power.
  var infixr = function (id, bp, led) {
    var s = symbol(id, bp);
    s.led = led || function (left) {
      this.first = left;
      var right = expression(bp - 1);
      this.second = right;
      this.arity = "binary";
      this.sexpr = [this.sexpr, left.sexpr, right.sexpr];
      return this;
    };
    return s;
  };

  var prefix = function (id, nud) {
    var s = symbol(id);
    s.nud = nud || function () {
      // scope.reserve(this);
      var expr = expression(70);
      this.first = expr;
      this.arity = "unary";
      this.sexpr = [this.sexpr, expr.sexpr];
      return this;
    };
    return s;
  };

  var stmt = function (s, f) {
    var x = symbol(s);
    x.std = f;
    return x;
  };

  symbol("(end)");
  symbol("(name)");
  symbol("(null)");
  symbol(':');
  symbol(';');
  symbol('LF');
  symbol(")");
  symbol("]");
  symbol("}");

  symbol("true").nud = function () { this.sexpr = true; return this; };
  symbol("false").nud = function () { this.sexpr = false; return this; };
  symbol("null").nud = function () { this.sexpr = null; return this; };

  // allow to skip values in function calls....
  symbol(",");

  symbol('(string_literal_single)').nud = function() {
    this.first = "'";
    this.arity = "unary";
    this.sexpr = Array.isArray(this.sexpr) ? this.sexpr : ["'", this.sexpr];                        // when string is typed D'2020-01-01' then we will have here s-expr
    return this;
  };

  symbol("(string_literal_double)").nud = function() {
    this.first = '"';
    this.arity = "unary";
    this.sexpr = Array.isArray(this.sexpr) ? this.sexpr : ['"', this.sexpr];
    return this;
  };

  symbol("(string_literal_column)").nud = function() {
    this.first = "'";
    this.arity = "unary";
    // this.sexpr = ["[]", this.sexpr];                                                             // It is already S-form
    return this;
  };


  symbol("(number_literal)").nud = itself;

  // [esix]: commented as in conflict with SQL operator ':'
  // infix("?", 20, function (left) {
  //   this.first = left;
  //   this.second = expression(0);
  //   advance(":");
  //   this.third = expression(0);
  //   this.arity = "ternary";
  //   this.sexpr = ["if", this.first.sexpr, this.second.sexpr, this.third.sexpr];
  //   return this;
  // });

  // [esix]: ternary operator with no conflict on ':' operator
  infix('?', 20, function (left) {
    this.first = left;
    this.second = expression(0);
    this.arity = 'binary';
    if (this.second.arity === 'binary' && this.second.value === ':') {
      this.sexpr = ["if", this.first.sexpr, this.second.sexpr[1], this.second.sexpr[2]];
    } else {
      makeError(this.second, "Invalid ternary operator.");
    }
    return this;
  });

  infixr("&&", 30);
  infixr("∧", 30);
  operator_alias("&&", "and");
  operator_alias("∧", "and");

  infixr('||', 30);
  infixr('∨', 30);
  operator_alias('||', 'or');
  operator_alias('∨', 'or');

  infixr('⍱', 30); operator_alias('⍱', 'nor');
  infixr('⍲', 30); operator_alias('⍲', 'nand');

  infixr('⊣', 30); operator_alias('⊣', 'car');
  infixr('⊢', 30); operator_alias('⊢', 'cdr');

  infixr('⍴', 30);

  /* will be used in logical scope, allow (a or and(b,c,ss)) */
  infixr("and", 30).nud = function () {
    return this
  };
  /* allow (a and or(b,c,ss)) */
  infixr("or", 30).nud = function () {
    return this
  };


  // required for SQL logical scope where a in (1,2,3)
  infixr("in", 30);
  infixr("is", 30);

  // for SQL types: '10'::BIGINT
  infixr("::", 90);

  // for SQL as
  infixr(":", 2);

  infix(":=", 30);

  infixr('~', 40);
  infixr('!~', 40);

  infixr('=', 40);
  infixr('≠', 40);
  operator_alias('≠', '!='); // from to canonical form;

  infixr('==', 40);
  infixr('!==', 40);
  infixr('!=', 40);
  infixr('<', 40);
  infixr('<=', 40);
  infixr('≤', 40);
  operator_alias('≤', '<=');

  infixr(">", 40);
  infixr(">=", 40);
  infixr("≥", 40);
  operator_alias("≥",">=");
  infixr("<>", 40);
  infixr("@", 40);

  infix("+", 50);
  infix("-", 50);
  infix("#", 50);

  infix("*", 60);
  infix("/", 60);

  infix("(", 80, function (left) {
    let a = [];
    this.arity = "binary";
    this.first = left;
    this.value = "(";       // it was '(' by dima
    this.second = a;
    if ((left.arity !== "unary" || left.id !== "function") &&
         left.arity !== "name" && left.id !== "(" &&
         left.id !== "&&" && left.id !== "||" && left.id !== "?") {
      makeError(left, "Expected a variable name.");
    }

    // dima support for missed function arguments...
    if (m_token.id !== ")") {
      if (false && (left.value == "where" || left.value == "filter" || left.value == "expr" || left.value == "logexpr")) {
        // специальный парсер для where - logical expression.
        // тут у нас выражение с использованием скобок, and, or, not и никаких запятых...
        // DIMA 2021: logexpr function will be generic name for logical things
        // where && filter is used for SQL generation and should not be changed....
        // expr is deprecated name for logexpr
        // FIXME: make transition to the logexpr!
        new_expression_scope("logical");
        var e = expression(0);
        m_expr_scope.pop();
        a.push(e);
      } else {
        new_expression_scope("lpe");
        while (true) {
          if (m_token.id === ',') {
            a.push({
              value: null,
              arity: "literal"
            });
            advance();
          } else if (m_token.id === ')') {
            a.push({
              value: null,
              arity: "literal"
            });
            break;
          } else {
            new_expression_scope("logical");
            var e = expression(0);
            //console.log("LOGICAL????? " + JSON.stringify(e));
            m_expr_scope.pop();
            // var e = statements();
            a.push(e);
            if (m_token.id !== ",") {
              break;
            }
            advance(",");
          }
        }
        m_expr_scope.pop();
      }
    }

    this.sexpr = [this.first.value].concat(a.map(function(el){return el.sexpr}));
    advance(")");
    return this;
  });


  function lifting(node, op) {
    if (node.value === op) {
      return lifting(node.first, op).concat(lifting(node.second, op));
    } else {
      return [node.sexpr];
    }
  }

  for (const op of [".", "..", "->", "->>"]) {
    infix(op, 70, function (left) {
      this.first = left;
      // this.second = expression(0);
      this.second = expression(70);
      this.arity = "binary";
      this.value = op;
      this.sexpr = [op].concat(lifting(this, op));
      return this;
    });
  }



  // WARNING HACK FIXME DIMA - добавил чтобы писать order_by(+a)
  // А также замена /table на +table в htSQL
  prefix("+");

  prefix("!");

  // allow func().not(a)   а также f(a is not null)
  let n = prefix("not", function () {                                                               // it is nud function
    var expr = expression(70);
    if (isArray(expr.sexpr) && expr.sexpr[0] === '()') {
      this.arity = 'name';
      this.value = 'not';
      this.sexpr = 'not';
      const e = {
        from: 0,
        to: 2,
        value: '(',
        arity: 'binary',
        sexpr: ['not'],
        first: this,
      };
      if (expr.sexpr.length > 1) {
        e.second = [{from: 4, to: 5, value: expr.sexpr[1], arity: 'literal', sexpr: expr.sexpr[1]}]
        e.sexpr.push(expr.sexpr)  // keep () in the parsed AST
        // e.sexpr = e.sexpr.concat(expr.sexpr) // keep () in the parsed AST
      }
      return e;
    }

    // simple operator `not expr`
    this.first = expr;
    this.arity = "unary";
    this.sexpr = [this.sexpr, expr.sexpr];
    return this;
  })

  n.led = function (left) {
    return this
  }; // will be used in logical scope

  prefix("¬");
  operator_alias("!", "not");
  operator_alias("¬", "not");

  prefix("-");                                                                                      // trying to optimize, when we have negated -number
  prefix("#");

  prefix(".",function () {
    var v = expression(70);
    if (v.value !== "(") {
      makeError(v, "Only functions may have dot (.) unary operator.");
    }
    // this.first = v;
    // this.arity = "unary";
    // return this;
    // skip unary dot !!!
    return v;
  });

  prefix("(", function () {
    if (m_token.value === ')'){
      // если это просто () две скобки, то возвращаем сразу кусок AST,генерим функцию с именем "()"
      // {"from":3,"to":4,"value":"(","arity":"operator","sexpr":"("}
      this.arity = "binary"
      this.sexpr = ["()"]
      this.first = { from: this.from, to: this.to+1, value: '()', arity: 'name', sexpr: ['()'] }
      advance(")");
      return this;
    }

    if (m_expr_scope.tp === "logical") {
      //  В скобках может быть два типа выражений
      //  - выражения:        2 + (3)             (1 + 1)             (1 + (1 + 2))
      //  - тупли:            2 + (3, 4)          (1,)                (,)
      //  попытаемся тут их разделить
      let a = [];
      if (m_token.id === ",") {                                                                     // обрабатываем (,)
        advance(",");
        a.push(undefined);                                                                          // симулируем туплу из двух элементов
        a.push(undefined);
      } else {
        while (true) {
          if (m_token.id === ")") {                                                                 // обрабатываем (1,)
            a.push(undefined);
            break;
          }
          a.push(expression(0));
          if (m_token.id !== ",") {
            break;
          }
          advance(",");
        }
      }
      advance(")");

      const sexpr = [a.length > 1 ? "tuple" : "()"].concat(a.filter(Boolean).map((el) => el.sexpr));
      return {
        first: a,
        value: "(",                              // FIXME: why not make it '()' ?? and looks like function `()` call ?
        arity: "unary",
        sexpr: sexpr,
      };
    }

    var e = expression(0);
    if ([".", "->"].includes(e.value)) {
      // в скобки взято выражение из цепочки LPE вызовов, нужно запомнить скобки, делаем push "()" в текущий AST
      e = {
        first: e,
        value: "(",
        arity: "binary",
        sexpr: ["()", e.sexpr]
      };
    }
    advance(")");
    return e;
  });

  if (!squareBrackets) {
    prefix("[", function () {
      var a = [];
      if (m_token.id !== "]") {
        while (true) {
          a.push(expression(0));
          // a.push(statements());
          if (m_token.id !== ",") {
            break;
          }
          advance(",");
        }
      }
      advance("]");
      this.first = a;
      this.arity = "unary";
      this.sexpr = ["["].concat(a.map((el) => el.sexpr));
      return this;
    });
  }

  // Array of form {1, 2, 3}: c, postgres, java, M
  prefix('{', function () {
    let a = [];
    if (m_token.id !== '}') {
      while (true) {
        a.push(expression(0));
        // a.push(statements());
        if (m_token.id !== ",") {
          break;
        }
        advance(",");
      }
    }
    advance('}');
    this.first = a;
    this.arity = "unary";
    this.sexpr = ["vector"].concat(a.map((el) => el.sexpr));
    return this;
  });

  return function (source) {
    m_source = source;
    m_tokens = tokenize(source, {squareBrackets});
    m_token_nr = 0;
    new_expression_scope("logical");
    advance();
    var s = statements();
    // var s = expression(0);
    advance("(end)");
    return s;
  };
};


const parser3 = make_parse({squareBrackets: false});
const parser4 = make_parse({squareBrackets: true});

/**
 *
 * @param str
 * @param {EvalOptions} options
 * @returns {*}
 */
export function parse(str, options = {}) {
  try {
    const squareBrackets = options.squareBrackets ?? false;                                         // by default - do not use square brackets (true)
    let parser;
    if (squareBrackets) {
      parser = parser4;                                                                             // In v4 - square brackets are interpreted as special strings (SQL column/table)
    } else {
      parser = parser3;
    }

    const parseResult = parser(str);   // from, to, value, arity, sexpr
    return parseResult.sexpr;

  } catch(err) {
    console.error("Error", err.message);
    console.error("Error", err.stack);
    throw err;
  }
}

export {LPESyntaxError};
