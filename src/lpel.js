
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

import console from './console/console';


const isDigit = (c) => (c >= '0' && c <= '9');
//const isLetter = (c) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
// https://stackoverflow.com/questions/9862761/how-to-check-if-character-is-a-letter-in-javascript
//const isLetter = (c) => RegExp(/^\p{L}$/,'u').test(c);
const isLetter = (c) => c.toLowerCase() != c.toUpperCase()


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
      ['name', 'message', 'from', 'to', 'key', 'value', 'arity', 'first', 'second', 'third', 'fourth'],
      4);

  throw new LPESyntaxError(errorDescription);
}


export function tokenize(s, prefix = '<>+-&', suffix = '=>&:') {
  if (s.startsWith('lpe:')) s = s.substr(4);
  if (s.startsWith('⚡'))  s = s.substr(1);

  let c;                      // The current character.
  let from;                   // The index of the start of the token.
  let i = 0;                  // The index of the current character.
  let length = s.length;
  let n;                      // The number value.
  let q;                      // The quote character.
  let str;                    // The string value.
  let result = [];            // An array to hold the results.
  const make = (type, value) => ({type, value, from, to: i});                   // Make a token object.

  // If the source string is empty, return nothing.
  if (!s) {
    return [];
  }

  // Loop through this text, one character at a time.
  c = s.charAt(i);
  while (c) {
    from = i;

    // Ignore whitespace.
    if (c <= ' ') {
      i += 1;
      c = s.charAt(i);

    // name.
    } else if (isLetter(c) || c === '_' || c === '$' || c === '#') {                         // first char of name. TODO: remove #
      str = c;
      i += 1;
      for (;;) {
        c = s.charAt(i);
        if (isLetter(c) || isDigit(c) || c === '_' || c === '$') {
          str += c;
          i += 1;
        } else {
          break;
        }
      }

      result.push(make('name', str));
    // number.

    // A number cannot start with a decimal point. It must start with a digit,
    // possibly '0'.

    } else if (c >= '0' && c <= '9') {
      str = c;
      i += 1;

      // Look for more digits.

      for (;;) {
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
        for (;;) {
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

      // Don't convert the string value to a number. If it is finite, then it is a good
      // token.
      // result.push(make('number', parseFloat(str)));
      // result.push(make('number', str));

      
      n = +str;
      if (isFinite(n)) {
        result.push(make('number', n));
      } else {
        makeError(make('number', str), "Bad number");
      }
      

    // string

    } else if (c === '\'' || c === '"') {
      str = '';
      q = c;
      i += 1;
      for (;;) {
        c = s.charAt(i);
        if (c < ' ') {
          // make('string', str).error(c === '\n' || c === '\r' || c === '' ?
          //     "Unterminated string." :
          //     "Control character in string.", make('', str));
          makeError(make('', str) || make(q==='"'?'string_double':'string_single', str),
                    c === '\n' || c === '\r' || c === '' ?
                         "Unterminated string." :
                         "Control character in string.");
        }

        // Look for the closing quote.

        if (c === q) {
          break;
        }

        // Look for escapement.

        if (c === '\\') {
          i += 1;
          if (i >= length) {
            makeError(make(q==='"'?'string_double':'string_single', str), "Unterminated string");
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
              makeError(make(q==='"'?'string_double':'string_single', str), "Unterminated string");
            }
            c = parseInt(s.substr(i + 1, 4), 16);
            if (!isFinite(c) || c < 0) {
              makeError(make(q==='"'?'string_double':'string_single', str), "Unterminated string");
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
      result.push(make(q==='"'?'string_double':'string_single', str));
      c = s.charAt(i);

    // comment.
    } else if (c === '/' && s.charAt(i + 1) === '/') {
      i += 1;
      for (;;) {
        c = s.charAt(i);
        if (c === '\n' || c === '\r' || c === '') {
          break;
        }
        i += 1;
      }

    // combining

    } else if (prefix.indexOf(c) >= 0) {
      str = c;
      i += 1;
      while (true) {
        c = s.charAt(i);
        if (i >= length || suffix.indexOf(c) < 0) {
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
