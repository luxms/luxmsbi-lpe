# Evaluator integration contract

LPE expressions use checked property access and callable dispatch by default.
Applications should account for the following behavior when supplying contexts
and callbacks.

## Data access

- `get_in()` evaluates its input expressions once and traverses own data
  properties. Retrieved values and path elements are never evaluated again.
- Array paths, separate path arguments, and quoted context names are supported.
- Keys must be strings or numbers. Missing properties return `undefined`;
  `get(object, key, fallback)` preserves an existing `undefined` value.
- Inherited data properties are ignored. Accessors, reserved prototype keys,
  and function implementation metadata are unavailable to expressions.
- Object updates, bindings, and copy operations follow the same restrictions.

```js
const context = {user: {roles: ['reader']}};
lpe.eval_lpe('get_in(user, ["roles", 0])', context); // 'reader'
```

## Calls and callbacks

LPE closures and ordinary application callbacks remain supported. `invoke` and
`~>` preserve the receiver for own application methods and supported built-in
methods. Native callables are limited to approved built-ins; native code
generation, reflection, and opaque bound functions are unsupported. The LPE
functions `eval`, `rep`, and `define` continue to interpret LPE expressions.

The same checks apply to higher-order callbacks, promise results, stream
values, and own `whenReady` callbacks. Rejected operations raise an error with
name `LPESecurityError` and code `LPE_SECURITY`.

Host callbacks are trusted application code. Expose only reviewed operations
and pass untrusted request data as plain JSON. Proxies, executable accessors,
and custom coercion hooks are outside the data contract. Initialize the
library in a trusted realm with intact built-ins. Integrations using bound or
unsupported native callbacks should provide a reviewed ordinary JavaScript
wrapper for the specific permitted operation.

The host remains responsible for authorization and resource limits. Do not
fall back to an unrestricted evaluator after a rejected operation.

## Build and validation

Run `npm run build` before `npm test`; tests consume `dist/lpe.js`. Boundary
coverage is in `test/test-security.js` and `test/test-streams.js`. Bundle loading
and LPE closures are also tested with native string compilation disabled.

Deploy the rebuilt bundle to every consumer, including vendored copies.
