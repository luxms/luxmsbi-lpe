export function parse(lpeExpression: string): any;

export function deparse(lispExpression: any): string;

export function eval_lisp(prog: any, ctx?: any, parameters?: any): any;

export function eval_lpe(prog: string, ctx?: any, parameters?: any): any;


declare module 'lpe' {
  export function parse(lpeExpression: string): any;

  export function deparse(lispExpression: any): string;

  export function eval_lisp(prog: any, ctx?: any): any;

  export function eval_lpe(prog: string, ctx?: any): any;
}
