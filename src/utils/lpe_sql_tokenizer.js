// 2024-04-23

// (c) 2024 Luxms



//import console from '../console/console';

// Transform a token object into an exception object and throw it.
function LPESyntaxError(message) {
    this.constructor.prototype.__proto__ = Error.prototype;
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    // this.stack = (new Error()).stack;
  }
  

function makeError(t, message) {
    t.message = message;
  
    const errorDescription = JSON.stringify(
        t,
        ['name', 'message', 'from', 'to', 'key', 'value', 'arity', 'first', 'second', 'third', 'fourth'],
        4);
  
    throw new LPESyntaxError(errorDescription);
}

export function tokenize_sql_template(s) {
  
    let c;                      // The current character.
    let from = 0;                   // The index of the start of the token.
    let i = 0;                  // The index of the current character.
    let length = s.length;
    let q;                      // The quote character.
    let str = '';                    // The string value.
    let result = [];            // An array to hold the results.
    let nested_curvy_level = 0
    const make = (type, value, adjustFrom=0, adjustTo=0) => ({type, value, from: from+adjustFrom, to: i+adjustTo});                   // Make a token object.
  
    // If the source string is empty, return nothing.
    if (!s) {
      return [];
    }
  
    // Loop through this text, one character at a time.
    c = s.charAt(i);
    while (c) {
        //console.log(`i=${i} c=${c} str=${str}`)

        if (c === '$'){
            i += 1
            c = s.charAt(i); // look ahead
            if (c === '{') {
                // LPE mode on
                // FIXME: check symbol before $: \${} is not lpe but \\${} is lpe!
                let lpe = ''
                // report accumulated text before ${
                if (str != '') {
                    result.push(make('literal', str , 0, -2));
                    str = ''
                }
                from = i+1
                nested_curvy_level = 0
                // READ INSIDE LPE
                for (;;) {
                    i += 1
                    c = s.charAt(i);
                    if (c === '{') {
                        nested_curvy_level += 1
                        lpe += '{'
                    } else if (c === '}') {
                        if (nested_curvy_level === 0) {
                            result.push(make('lpe', lpe, -2, 0));
                            i += 1
                            c = s.charAt(i)
                            from = i
                            break
                        } else {
                            nested_curvy_level -= 1
                            lpe += '}'
                        }
                    } else if (c === '\'' || c === '"') {
                        lpe += c;
                        q = c;
                        i += 1;
                        // READ IN THE STRING QUOTE
                        for (;;) {
                            c = s.charAt(i);
                            if (c < ' ') {
                                // make('string', str).error(c === '\n' || c === '\r' || c === '' ?
                                //     "Unterminated string." :
                                //     "Control character in string.", make('', str));
                                makeError(make('', lpe) || make(q==='"'?'string_double':'string_single', lpe),
                                        c === '\n' || c === '\r' || c === '' ?
                                            "Unterminated string." :
                                            "Control character in string.");
                            }
                    
                            // Look for the closing quote.
                    
                            if (c === q) {
                                lpe += q
                                break;
                            }
                    
                            // Look for escapement.
                    
                            if (c === '\\') {
                                i += 1;
                                if (i >= length) {
                                makeError(make(q==='"'?'string_double':'string_single', lpe), "Unterminated string");
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
                                    makeError(make(q==='"'?'string_double':'string_single', lpe), "Unterminated string");
                                }
                                c = parseInt(s.substr(i + 1, 4), 16);
                                if (!isFinite(c) || c < 0) {
                                    makeError(make(q==='"'?'string_double':'string_single', lpe), "Unterminated string");
                                }
                                c = String.fromCharCode(c);
                                i += 4;
                                break;
                                }
                            }
                            lpe += c;
                            i += 1;
                        }
                    } else if (c === '') {
                        // overflow }
                        if (nested_curvy_level!==0){
                            makeError(make('lpe',lpe), "Unbalanced {}");
                        } else {
                            makeError(make('lpe',lpe), "EOT reached in LPE expression");
                        }
                    } else {
                        lpe += c
                    }
                }

                if (nested_curvy_level!==0){
                    makeError(make('lpe',lpe), "--> Unbalanced {}");
                }
            } else {
                str += '$'
            }
        } else {
            str += c
            i += 1
            c = s.charAt(i);
        }
    }

    if (str) {
        result.push(make('literal', str, 0, -1));
    }

    return result;
  }
  
// export default tokenize_sql_template;