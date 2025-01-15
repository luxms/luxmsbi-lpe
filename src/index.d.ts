export function parse(lpeExpression: string): any;

export function deparse(lispExpression: any): string;

export function eval_lisp(prog: any, ctx?: any, parameters?: any): any;

export function eval_lpe(prog: string, ctx?: any, parameters?: any): any;

export const LPESyntaxError: any;

export function isString(v: any): boolean;
export function isArray(v: any): boolean;
export function isHash(v: any): boolean;
export function isFunction(v: any): boolean;
export function isNumber(v: any): boolean;
export function makeSF(v: any): any;
export const STDLIB: any;
export function unbox(args: any[], unboxFn: (values: any[]) => any, streamAdapter?: any): any;


declare module 'lpe' {
  export function parse(lpeExpression: string): any;

  export function deparse(lispExpression: any): string;

  export function eval_lisp(prog: any, ctx?: any): any;

  export function eval_lpe(prog: string, ctx?: any): any;

  export function unbox(args: any[], unboxFn: (values: any[]) => any, streamAdapter?: any): any;

  export const LPESyntaxError: any;

  export function isString(v: any): boolean;
  export function isArray(v: any): boolean;
  export function isHash(v: any): boolean;
  export function isFunction(v: any): boolean;
  export function isNumber(v: any): boolean;
  export function makeSF(v: any): any;
  export const STDLIB: any;
}
