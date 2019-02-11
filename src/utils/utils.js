
export function db_quote_literal(intxt) {
     return "'" + intxt.toString().replace(/\'/g , "''") + "'";
} 
