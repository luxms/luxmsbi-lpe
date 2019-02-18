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
// Douglas Crockford
// 2010-06-26
//////////////////////////////////////////////////
// Later hacked to parse LPE instead of JavaScript
// Dmitry Dorofeev
// 2017-01-20


import console from './console/console';
import {tokenize, makeError, LPESyntaxError} from './lpel';


var make_parse = function () {
  var symbol_table = {};
  var token;
  var tokens;
  var token_nr;

  // стэк для типов выражений
  var expr_scope = { pop: function () {}}; // для разбора логических выражений типа (A and B or C)

  // для хранения алиасов для операций
  var operator_aliases = {};

  var operator_alias = function(from, to) {
    operator_aliases[from] = to;
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
      expr_scope = this.parent;
    },
    parent: null,
    tp: "logical"
  };

  var expr_lpe_scope = {
    pop: function () {
      expr_scope = this.parent;
    },
    parent: null,
    tp: "lpe"
  };

  var new_expression_scope = function (tp) {
    var s = expr_scope;
    expr_scope = Object.create(tp == "logical"?expr_logical_scope:expr_lpe_scope);
    expr_scope.parent = s;
    return expr_scope;
  };

  var advance = function (id) {
    var a, o, t, v;
    if (id && token.id !== id) {
      makeError(token, "Got " + token.value + " but expected '" + id + "'.");
    }
    if (token_nr >= tokens.length) {
      token = symbol_table["(end)"];
      return;
    }
    t = tokens[token_nr];
    token_nr += 1;
    v = t.value;
    a = t.type;

    if (a === "name") {

      if (v === 'true' || v === 'false' || v === 'null') {
        o = symbol_table[v];
        a = "literal";
      } else if (expr_scope.tp == "logical") {
        if (v === "or" || v === "and" || v === "not" || v === "in" || v === "is") {
          a = "operator";
          o = symbol_table[v];
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
      o = symbol_table[v];
      if (!o) {
        makeError(t, "Unknown operator.");
      }
    } else if (a === "string_double") {
      o = symbol_table["(string_literal_double)"];
      a = "literal";
    } else if (a === "string_single") {
      o = symbol_table["(string_literal_single)"];
      a = "literal";
    } else if (a === "number") {
      o = symbol_table["(number_literal)"];
      a = "literal";
    } else {
      makeError(t, "Unexpected token.");
    }
    token = Object.create(o);
    token.from = t.from;
    token.to = t.to;
    token.value = v;
    token.arity = a;
    if (a == "operator") {
      token.sexpr = operator_aliases[v];
    } else {
      token.sexpr = v; // by dima
    }
    return token;
  };

  var statement = function () {
    var n = token, v;

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
    //advance(";");
    return v;
  };

  var statements = function () {
    var a = [], s;
    while (true) {
        //console.log(token);
        if ( token.id === "(end)") {
            break;
        } else if(token.value === ';'){
          // skip optional ;
           advance();
        }
        s = statement();
        //console.log("STATEMENT ", s);
        if (s) {
            a.push(s);
        }
    }
    return a.length === 0 ? null : a.length === 1 ? a[0]: {"sexpr": ["begin"].concat(a.map(function(el){return el["sexpr"];}))};
  };

  var expression = function (rbp) {
    var left;
    var t = token;
    advance();
    left = t.nud();
    while (rbp < token.lbp) {
      t = token;
      advance();
      left = t.led(left);
    }
    return left;
  };

  var original_symbol = {
    nud: function () {
      makeError(this, "Undefined.");
    },
    led: function (left) {
      makeError(this, "Missing operator.");
    }
  };

  var symbol = function (id, bp) {
    var s = symbol_table[id];
    bp = bp || 0;
    if (s) {
      if (bp >= s.lbp) {
        s.lbp = bp;
      }
    } else {
      s = Object.create(original_symbol);
      s.id = s.value = id;
      s.lbp = bp;
      symbol_table[id] = s;
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

  symbol("(end)");
  symbol("(name)");
  symbol("(null)");
  symbol(":");
  symbol(";");
  symbol(")");
  symbol("]");
  symbol("}");

  symbol("true").nud = function () { this.sexpr = true; return this; };
  symbol("false").nud = function () { this.sexpr = false; return this; };
  symbol("null").nud = function () { this.sexpr = null; return this; };

  // allow to skip values in function calls....
  var comma = symbol(",");

  symbol("(string_literal_double)").nud = function() {
    this.first = '"';
    this.arity = "unary";
    this.sexpr = ['"', this.sexpr];
    return this;
  };

  symbol("(string_literal_single)").nud = function() {
    this.first = "'";
    this.arity = "unary";
    this.sexpr = ["'", this.sexpr];
    return this;
  };

  symbol("(number_literal)").nud = itself;

  infix("?", 20, function (left) {
    // FIXME TODO - need sexpr !!!
    this.first = left;
    this.second = expression(0);
    advance(":");
    this.third = expression(0);
    this.arity = "ternary";
    return this;
  });

  infixr("&&", 30);
  infixr("∧", 30);
  operator_alias("&&","and");
  operator_alias("∧","and");

  infixr("||", 30);
  infixr("∨", 30);

  operator_alias("||","or");
  operator_alias("∨","or");

  /* will be used in logical scope */
  infixr("and", 30);
  infixr("or", 30);
  // required for SQL logical scope where a in (1,2,3)
  infixr("in", 30);
  infixr("is", 30);
  prefix("not");

  // for SQL types: '10'::BIGINT
  infixr("::", 90);

  // for SQL as
  infixr(":", 80);

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

  infix("+", 50);
  infix("-", 50);

  infix("*", 60);
  infix("/", 60);

  infix("(", 80, function (left) {
    var a = [];
    if (left.id === "[") {
          // FIXME TODO
          this.arity = "ternary";
          this.first = left.first;
          this.second = left.second;
          this.third = a;
    } else {
          this.arity = "binary";
          this.first = left;
          this.value = "("; // it was '(' by dima
          this.second = a;
          if ((left.arity !== "unary" || left.id !== "function") &&
              left.arity !== "name" && left.id !== "(" &&
              left.id !== "&&" && left.id !== "||" && left.id !== "?") {
            makeError(left, "Expected a variable name.");
          }
    }
    // dima support for missed function arguments...
    if (token.id !== ")") {
      if (false && left.value == "where") {
        // специальный парсер для where - logical expression.
        // тут у нас выражение с использованием скобок, and, or, not и никаких запятых...
        new_expression_scope("logical");
        var e = expression(0);
        expr_scope.pop();
        a.push(e);
      } else {
        new_expression_scope("lpe");
        while (true) {
          // console.log(">" + token.arity + " NAME:" + left.value);
          if (token.id === ',') {
            a.push({
              value: null,
              arity: "literal"
            });
            advance();
          } else if (token.id === ')') {
            a.push({
              value: null,
              arity: "literal"
            });
            break;
          } else {
            new_expression_scope("logical");
            var e = expression(0);
            expr_scope.pop();
            // var e = statements();
            a.push(e);
            if (token.id !== ",") {
              break;
            }
            advance(",");
          }
        }
        expr_scope.pop();
      }
    }

    this.sexpr = [this.first.value].concat(a.map(function(el){return el.sexpr}));
    advance(")");
    return this;
  });


  function lift_funseq(node) {
    if (node.value === "->") {
      return lift_funseq(node.first).concat(lift_funseq(node.second));
    } else if (node.value === "()") {
      if (node.first.value === "->"){
        // если у нас в скобки взято выражение "->", то скобки можно удалить
        // if (true).(frst().second()) === if(true) => [->> [first] [second]] скобки не нужны, 
        // так как seq уже группирует вызовы в цепочку
          return [["->"].concat(lift_funseq(node.first.first)).concat(lift_funseq(node.first.second))];
      } else {
          return lift_funseq(node.first);
      }
    } else {
      return [node.sexpr];
    }
  }

  function lift_funseq_2(node) {
    if (node.value === "->>") {
      return lift_funseq(node.first).concat(lift_funseq(node.second));
    } else if (node.value === "()") {
      if (node.first.value === "->>"){
        // если у нас в скобки взято выражение "->", то скобки можно удалить
        // if (true).(frst().second()) === if(true) => [->> [first] [second]] скобки не нужны, 
        // так как seq уже группирует вызовы в цепочку
          return [["->>"].concat(lift_funseq(node.first.first)).concat(lift_funseq(node.first.second))];
      } else {
          return lift_funseq(node.first);
      }
    } else {
      return [node.sexpr];
    }
  }

  infix(".", 70, function (left) {
    this.first = left;
    // this.second = expression(0);
    this.second = expression(70);
    this.arity = "binary";
    this.value = "->";
    this.sexpr = ["->"].concat(lift_funseq(this));
    return this;
  });

  infix("..", 70, function (left) {
    this.first = left;
    // this.second = expression(0);
    this.second = expression(70);
    this.arity = "binary";
    this.value = "->>";
    this.sexpr = ["->>"].concat(lift_funseq_2(this));
    return this;
  });

  // WARNING HACK FIXME DIMA - добавил чтобы писать order_by(+a)
  // А также замена /table на +table в htSQL
  prefix("+");

  prefix("!");
  prefix("not"); // will be used in logical scope
  prefix("¬");
  operator_alias("!", "not");
  operator_alias("¬", "not");

  // trying to optimize, when we have negated -number
  prefix("-");

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
    var e = expression(0);
    if (expr_scope.tp == "logical") {
      // we should remember all brackets to restore original user expression
      e.sexpr = ["()", e.sexpr];
    } else {
      if (e.value === "->") {
        // в скобки взято выражение из цепочки LPE вызовов, нужно запомнить скобки, делаем push "()" в текущий AST 
        e = {
          first: e,
          value: "()",
          arity: "unary",
          sexpr: ["()", e.sexpr]
        };
      }
    }
    advance(")");
    return e;
  });

  prefix("[", function () {
    var a = [];
    if (token.id !== "]") {
      while (true) {
        a.push(expression(0));
        // a.push(statements());
        if (token.id !== ",") {
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

  return function (source) {
    tokens = tokenize(source, '=<>!+-*&|/%^:.', '=<>&|:.');
    token_nr = 0;
    advance();
    var s = statements();
    // var s = expression(0);
    advance("(end)");
    return s;
  };
};



const parser = make_parse();
// console.log('LPE Parser initialized')


export function parse(str) {
  try {
    const parseResult = parser(str);   // from, to, value, arity, sexpr
    return parseResult.sexpr;

  } catch(err) {
    console.error("Error", err.message);
    console.error("Error", err.stack);
    throw err;
  }
}

export {LPESyntaxError};
