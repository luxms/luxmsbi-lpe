export function parse(lpeExpression: string): any;

export function eval_lisp(prog: any): any;

export function eval_lpe(prog: string, ctx?: any): any;


declare module 'lpe' {
  export function eval_lisp(prog: any): any;

  export function parse(lpeExpression: string): any;
}
