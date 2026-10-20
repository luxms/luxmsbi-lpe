const assert = require("node:assert/strict");
const {readFileSync, writeFileSync} = require("node:fs");
const {describe, it} = require("node:test");
const lpe = require(process.env.LPE_JS_MODULE || "../../dist/lpe");
const path = require("node:path").join(__dirname, "../fixtures/runtime-dispatch.json");
const undefinedValue = {$lpe: "undefined"};
const q = value => ["q", value];

function encode(value) {
  if (value === undefined) return undefinedValue;
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, encode(item)]));
  return value;
}

function observe(test) {
  const events = [];
  const context = {
    ...structuredClone(test.context || {}),
    mark: value => { events.push(["mark", encode(value)]); return value; },
    resolver: (name, value, options) => {
      if (name !== "x") return undefined;
      events.push(["resolve", encode(value), !!options.resolveString,
        !!options.disallowLibFunctionsGetting]);
      const config = test.resolver;
      if (config.error) throw new Error("resolver-error");
      if (config.options && !options.resolveString) return undefined;
      return config.result?.$lpe === "undefined" ? undefined : config.result;
    },
  };
  try {
    return {value: encode(lpe.eval_lisp(structuredClone(test.ast), context, test.options)), events};
  } catch (error) {
    return {error: String(error?.message ?? error)
      .replace(/^Error: (?=.* is not a function$)/, ""), events};
  }
}

function inputs() {
  const cases = [];
  for (const [id, operator, context] of [
    ["missing", "missing", {}], ["number", 7, {}], ["null", null, {}],
    ["false", false, {}], ["bound-number", "blocked", {blocked: 7}],
    ["bound-null", "blocked", {blocked: null}],
    ["bound-object", "blocked", {blocked: {}}],
  ]) {
    for (const options of [undefined, {resolveString: false}]) {
      cases.push({
        id: `dispatch:${id}:${options ? "unresolved" : "default"}`,
        legacy: true,
        ast: [operator, ["mark", 1], ["throw", q("argument-error")]],
        context, ...(options ? {options} : {}),
      });
    }
  }
  cases.push(
    {id: "dispatch:nested-missing", legacy: true,
      ast: ["macroexpand", ["firstArg", ["mark", 1]]]},
    {id: "dispatch:caught-side-effect", legacy: true,
      ast: ["try", ["missing", ["assign", "n", 7]], "err", "n"], context: {n: 0}},
    {id: "dispatch:earlier-sibling-once", legacy: true,
      ast: ["begin", ["mark", 1], ["missing", ["mark", 2]]]},
    {id: "dispatch:computed-operator-once", legacy: true,
      ast: [["mark", 7], ["mark", 2]]},
    {id: "dispatch:closure-parameter",
      ast: ["let", [["f", ["fn", ["op"], ["op", ["mark", 1]]]]], ["f", 7]]},
    {id: "dispatch:closure-fallback",
      ast: ["let", [["f", ["fn", [], ["begin", ["+", 2, 3], ["missing", ["mark", 1]]]]]],
        ["f"]]},
    {id: "dispatch:lazy-branch", legacy: true,
      ast: ["if", false, ["missing", ["mark", 1]], 42]},
    {id: "dispatch:callable-control", legacy: true,
      ast: ["+", ["mark", 1], ["mark", 2]]},
    {id: "assignment:language-function",
      ast: ["let", ["fn", ["name", "value"],
        ["if", ["=", "name", q("x")], 4, ["get", {}, q("missing")]]],
        ["list", ["def", "x", 8], "x"]]},
  );
  for (const name of ["def", "assign", ":="]) {
    for (const [mode, resolver] of [
      ["number", {result: 4}], ["null", {result: null}], ["false", {result: false}],
      ["missing", {result: undefinedValue}], ["error", {error: true}],
    ]) {
      cases.push({
        id: `assignment:${name}:${mode}`, resolver, context: {x: 2},
        ast: ["let", ["identity", "resolver"], ["list", [name, "x", ["mark", 8]], "x"]],
      });
    }
    cases.push(
      {id: `assignment:${name}:undefined-rhs`, resolver: {result: 4},
        ast: ["let", ["identity", "resolver"], [name, "x", ["get", {}, q("missing")]]]},
      {id: `assignment:${name}:missing-binding`, resolver: {result: undefinedValue},
        ast: ["let", ["identity", "resolver"],
          ["begin", [name, "x", ["mark", 8]], "x"]]},
      {id: `assignment:${name}:rhs-error`, resolver: {result: 4},
        ast: ["let", ["identity", "resolver"], [name, "x", ["throw", q("rhs-error")]]]},
      {id: `assignment:${name}:option-fallthrough`,
        options: {resolveString: false, disallowLibFunctionsGetting: true},
        resolver: {result: 4, options: true}, context: {x: 2},
        ast: ["let", ["identity", "resolver"], ["list", [name, "x", 8], "x"]]},
      {id: `assignment:${name}:option-match`,
        options: {resolveString: true, disallowLibFunctionsGetting: true},
        resolver: {result: 4, options: true},
        ast: ["let", ["identity", "resolver"], ["list", [name, "x", 8], "x"]]},
    );
  }
  return cases;
}

if (process.argv.includes("--write")) {
  const cases = inputs().map(test => ({...test, expected: observe(test)}));
  writeFileSync(path, `${JSON.stringify({jsVersion: "1.7.3", cases}, null, 2)}\n`);
  console.log(`${cases.length} JS runtime dispatch and assignment observations`);
} else {
  const fixture = JSON.parse(readFileSync(path, "utf8"));
  describe("Current JS call dispatch and function-context assignment", () => {
    assert.deepEqual(fixture.cases.map(({expected, ...test}) => test), inputs());
    for (const test of fixture.cases) {
      it(test.id, () => assert.deepEqual(observe(test), test.expected));
    }
  });
}
