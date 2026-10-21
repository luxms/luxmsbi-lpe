import * as safe from './security';

// Separate immutable policies, never an ambient/global mode switch.
const unsafe = Object.freeze({
  ...safe,
  safeKey: key => key,
  safeFunction: fn => fn,
  safeValue: value => value,
  safeApply: (fn, args, receiver) => Reflect.apply(fn, receiver, args),
  safeConstruct: (fn, args) => Reflect.construct(fn, args),
  safeGet: (object, key, fallback) => object != null && key in Object(object) ? object[key] : fallback,
  safeMethod: (object, key) => object[key],
  safeBoundMethod: (object, key) => {
    const member = object[key];
    return typeof member === 'function' ? safe.markUnsafe((...args) => Reflect.apply(member, object, args)) : member;
  },
  safeSet: (object, key, value) => (object[key] = value),
  safeDelete: (object, key) => delete object[key],
  safeEntries: object => Object.entries(object),
  safeFromEntries: entries => Object.fromEntries(entries),
  safeGetIn: (object, path) => {
    for (const key of path) {
      if (object == null) return undefined;
      object = object[key];
    }
    return object;
  },
});

export function evaluationPolicy(options) {
  return options?.unsafe === true ? unsafe : safe;
}
