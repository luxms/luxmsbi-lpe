
// http://javascript.crockford.com/tdop/tdop.html

// 2010-02-23

// (c) 2006 Douglas Crockford

// Produce an array of simple token objects from a string.
// A simple token object contains these members:
//      type: 'name', 'string', 'number', 'operator'
//      value: string or number value of the token
//      from: index of first character of the token
//      to: index of the last character + 1

// Comments of the // type are ignored.

// Operators are by default single characters. Multicharacter
// operators can be made by supplying a string of prefix and
// suffix characters.
// characters. For example,
//      '<>+-&', '=>&:'
// will match any of these:
//      <=  >>  >>>  <>  >=  +: -: &: &&: &&


const isDigit = (c) => (c >= '0' && c <= '9');
//const isLetter = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
// https://stackoverflow.com/questions/9862761/how-to-check-if-character-is-a-letter-in-javascript
//const isLetter = (c) => RegExp(/^\p{L}$/,'u').test(c);
const isLetter = (c) => c.toLowerCase() !== c.toUpperCase();

/**
 * SINGLE QUOTE '
 * @type {string}
 */
const SQUOT = '\'';
/**
 * DOUBLE QUOTE "
 * @type {string}
 */
const DQUOT = '"';


// Transform a token object into an exception object and throw it.
export function LPESyntaxError(message) {
  this.constructor.prototype.__proto__ = Error.prototype;
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  // this.stack = (new Error()).stack;
}


export function makeError(t, message) {
  t.message = message;

  const errorDescription = JSON.stringify(
      t,
      ['name', 'message', 'src', 'crs', 'from', 'to', 'key', 'value', 'arity', 'first', 'second', 'third', 'fourth'],
      4);

  throw new LPESyntaxError(errorDescription);
}


const PREFIX = '>!+-*&|/%^:.';
const SUFFIX = '=<>&|:.';

// Наверное более правильно перечислять явно какой оператор за кем может идти а не вот это вот все
const OPSEQ = {
  '<': '-=<>',                                               // <-  <=  <<  <>
  '=': '=>',                                                  //  == =>
}


/**
 *
 * @param {string} s
 * @param {{squareBrackets: boolean}} options
 * @returns {*[]}
 */
export function tokenize(s, options) {
  if (typeof s !== "string")
    throw `Tokenizer expects "string", encountered "${typeof s}". Value: ${s}`;
  if (!s) return [];                                                                                // If the source string is empty, return nothing.
  if (s.startsWith('lpe:')) s = s.substr(4);
  if (s.startsWith('⚡'))  s = s.substr(1);

  const {squareBrackets} = options;

  let from;                   // The index of the start of the token.
  let i = 0;                  // The index of the current character.
  let length = s.length;
  let n;                      // The number value.
  let str;                    // The string value.
  let result = [];            // An array to hold the results.

  /**
   *
   * @param {'name' | 'number' | 'operator' | 'LF' | 'string_double' | 'string_single' | 'string_column'} type
   * @param {*} value
   * @returns {{from, to: number, type, value}}
   */
  const make = (type, value) => ({type, value, from, to: i});                   // Make a token object.

  /**
   * When current character is one of opening quote, will proceed until closing qoute
   * @returns {{str: string, type: ("string_double"|"string_single"|"string_column")}}
   */
  const nextString = () => {
    let c = s.charAt(i);
    /** @type {'string_double' | 'string_single' | 'string_column'}  */
    const type =
        c === DQUOT ? 'string_double' :
        c === SQUOT ? 'string_single' :
                      'string_column';
    const closer = c === DQUOT ? DQUOT : c === SQUOT ? SQUOT : ']';
    let str = '';
    i += 1;                                                                                         // use global
    for (;;) {
      c = s.charAt(i);
      if (c < ' ') {
        makeError(make('', str) || make(type, str),
            c === '\n' || c === '\r' || c === '' ?
                "Unterminated string." :
                "Control character in string.");
      }

      if (c === closer) {                                                                         // Look for the closing quote.
        break;
      }

      if ((type === 'string_single' || type === 'string_double') && c === '\\') {                 // Look for escapement.
        i += 1;
        if (i >= length) {
          makeError(make(type, str), "Unterminated string");
        }
        c = s.charAt(i);
        switch (c) {
          case 'b':
            c = '\b';
            break;
          case 'f':
            c = '\f';
            break;
          case 'n':
            c = '\n';
            break;
          case 'r':
            c = '\r';
            break;
          case 't':
            c = '\t';
            break;
          case 'u':
            if (i >= length) {
              makeError(make(type, str), "Unterminated string");
            }
            c = parseInt(s.substr(i + 1, 4), 16);
            if (!isFinite(c) || c < 0) {
              makeError(make(type, str), "Unterminated string");
            }
            c = String.fromCharCode(c);
            i += 4;
            break;
        }
      }
      str += c;
      i += 1;
    }
    i += 1;
    return {type, str};
  };

  let c;                                                                                            // The current character.
  while ((c = s.charAt(i))) {                                                                       // Loop through this text, one character at a time.
    from = i;

    if (c === '\n') {
      i++;
      // result.push(make('LF', c));

    } else if (c <= ' ') {                                                                          // Ignore whitespace.
      i += 1;
      c = s.charAt(i);

    } else if (isLetter(c) || c === '_' || c === '$') {                                             // Name: first char of name.
      let name = c;
      i += 1;
      for (; ;) {
        c = s.charAt(i);
        if (isLetter(c) || isDigit(c) || c === '_' || c === '$') {
          name += c;
          i += 1;
        } else {
          break;
        }
      }

      // Handle typed (D'2020-01-01') strings here because there MUST NOT be space between element and
      // We handle only ' and " string, because xxx[...] are handled differently, ALLOWING space
      if (c === SQUOT || c === DQUOT) {
        const {str, type} = nextString();
        result.push(make(type, [c, str, name]));                                                    // set the value [', str, strType]
      } else {
        result.push(make('name', name));
      }

      // number.
      // A number cannot start with a decimal point. It must start with a digit,
      // possibly '0'.
    } else if (c >= '0' && c <= '9') {
      str = c;
      i += 1;

      // Look for more digits.

      for (; ;) {
        c = s.charAt(i);
        if (c < '0' || c > '9') {
          break;
        }
        i += 1;
        str += c;
      }

      // Look for a decimal fraction part.

      if (c === '.') {
        i += 1;
        str += c;
        for (; ;) {
          c = s.charAt(i);
          if (c < '0' || c > '9') {
            break;
          }
          i += 1;
          str += c;
        }
      }

      // Look for an exponent part.
      if (c === 'e' || c === 'E') {
        i += 1;
        str += c;
        c = s.charAt(i);
        if (c === '-' || c === '+') {
          i += 1;
          str += c;
          c = s.charAt(i);
        }
        if (c < '0' || c > '9') {
          makeError(make('number', str), "Bad exponent");
        }
        do {
          i += 1;
          str += c;
          c = s.charAt(i);
        } while (c >= '0' && c <= '9');
      }

      // Make sure the next character is not a letter.

      if (c >= 'a' && c <= 'z') {
        str += c;
        i += 1;
        makeError(make('number', str), "Bad number");
      }

      // Don't convert the string value to a number. If it is finite, then it is a good token.
      // result.push(make('number', parseFloat(str)));
      // result.push(make('number', str));

      n = +str;
      if (isFinite(n)) {
        result.push(make('number', n));
      } else {
        makeError(make('number', str), "Bad number");
      }

    } else if (c === SQUOT || c === DQUOT) {                                                        // 'string', "string",
      const {type, str} = nextString();
      result.push(make(type, [c, str]));

    } else if (squareBrackets && c === '[') {                                                       //  [string]
      const {type, str} = nextString();
      result.push(make(type, str));

    } else if (c === '/' && s.charAt(i + 1) === '/') {                                              // comment
      i += 1;
      for (; ;) {
        c = s.charAt(i);
        if (c === '\n' || c === '\r' || c === '') {
          break;
        }
        i += 1;
      }

    } else if (OPSEQ[c]) {                                                                          // Только для операторов из двух символов - более строгие правила
      const nextOp = OPSEQ[c];
      str = c;
      i += 1;
      c = s.charAt(i);
      if (nextOp.includes(c)) {
        str += c;
        i += 1;
      }
      result.push(make('operator', str));

    } else if (PREFIX.indexOf(c) >= 0) {                                                            // combining
      str = c;
      i += 1;
      while (true) {
        c = s.charAt(i);
        if (i >= length || SUFFIX.indexOf(c) < 0) {
          break;
        }
        str += c;
        i += 1;
      }
      result.push(make('operator', str));

   // single-character operator
    } else {
      i += 1;
      result.push(make('operator', c));
      c = s.charAt(i);
    }
  }
  return result;
}

export default tokenize;
