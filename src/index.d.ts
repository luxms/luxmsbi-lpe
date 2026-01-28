interface Stream<T> {

}

export interface StreamAdapter {
  /**
   * Create stream with initial value and dispose callback
   * @param initialValue value to initialize stream with
   * @param onDispose callback will be called when stream is destroyed
   */
  createStream<T>(initialValue: T, onDispose: () => unknown): Stream<T>;

  retain<T>(stream: Stream<T>): void;

  release<T>(stream: Stream<T>): void;

  /**
   * check if object provided is stream of any type
   * @param obj
   */
  isStream<T>(obj: any): obj is Stream<T>;

  getLastValue<T>(stream: Stream<T>): T;

  next<T>(stream: Stream<T>, v: T): void;

  subscribe<T>(stream: Stream<T>, callback: (value: T) => unknown): void;
}

export interface EvalOptions {
  /**
   * Proceed variables to their names <br>`lpe 'x' -> string 'x' (if x is not defined)`
   */
  resolveString?: boolean;
  /**
   * Is there any streaming library so lpe can use it
   */
  streamAdapter?: StreamAdapter;
  /**
   * Should `[Square Brackets]` be interpreted as string
   */
  squareBrackets?: boolean;
}

export function parse(lpeExpression: string, options?: EvalOptions): any;

export function deparse(lispExpression: any): string;

export function eval_lisp(prog: any, ctx?: any, options?: EvalOptions): any;

export function eval_lpe(prog: string, ctx?: any, options?: EvalOptions): any;

export function unbox(args: any[], unboxFn: (values: any[]) => any, streamAdapter?: StreamAdapter): any;

export const LPESyntaxError: any;

export function $var$(ctx: any, varname: string, value?: any, options?: any): any;

export function makeSF(v: any): any;

export function makeVararg(template: (string | {[pattern: string]: string})[], callback: (...args: any[]) => unknown): any;

export const STDLIB: any;

export const $VAR$: Symbol;
