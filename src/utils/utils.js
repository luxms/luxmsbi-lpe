
export function db_quote_literal(intxt) {
     return "'" + intxt.toString().replace(/\'/g , "''") + "'";
} 

export function db_quote_ident(intxt) {
     return '"' + intxt.toString() + '"';
} 
