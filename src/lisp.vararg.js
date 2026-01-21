/**
 * Variadic argument support for LPE functions.
 *
 * Usage:
 *   ctx = {
 *     myfunc: makeVararg(["a:int", "b:fn"], (a, b, args, kwargs) => {
 *       // Template args (a, b) come first, then remaining args[] and kwargs{}
 *     }),
 *   }
 */

import { EVAL } from "./lisp";
import unbox from "./lisp.unbox";

function parseTemplate(template) {
  if (!Array.isArray(template)) {
    throw new Error("LPE vararg template must be array");
  }

  const varnames = [];
  let typesCast = {};
  let foundTypeObject = false;

  for (const entry of template) {
    if (foundTypeObject) {
      throw new Error(
        "LPE vararg template definition error: must be no arguments after type declaration"
      );
    }

    if (typeof entry === "string") {
      const match = entry.match(/^(.*):\s*(\w+)$/);
      if (match) {
        varnames.push(match[1]);
        typesCast[match[1].trim()] = match[2].trim().toLowerCase();
      } else {
        varnames.push(entry);
      }
    } else if (typeof entry === "object" && entry !== null) {
      foundTypeObject = true;
      typesCast = { ...typesCast, ...entry };
    } else {
      throw new Error(
        `LPE vararg template definition error: type ${typeof entry} is not supported`
      );
    }
  }

  function getType(varname) {
    if (varname in typesCast) {
      return typesCast[varname];
    }
    for (const [pattern, type] of Object.entries(typesCast)) {
      try {
        if (new RegExp(`^${pattern}$`).test(varname)) {
          return type;
        }
      } catch {
        // Invalid regex pattern - skip
      }
    }
    return undefined;
  }

  return { varnames, getType };
}

/**
 * Creates a variadic function with named template arguments.
 *
 * Template format: ["argName", "argName:type", { "pattern": "type" }]
 * - Type "fn" wraps the AST in a thunk (lazy evaluation)
 * - Other types evaluate immediately
 *
 * The wrapped function receives: ...templateArgs, remainingArgs[], remainingKwargs{}
 */
export default function makeVararg(template, fn) {
  const { varnames, getType } = parseTemplate(template);

  function varargHandler(ast, ctx, opt) {
    // Step 1: Collect all arguments with their original indices
    // Each entry: { originalIndex, ast, name?, kind: "positional" | "kwarg" }
    const allArgs = [];
    let positionalIndex = 0;

    for (let i = 0; i < ast.length; i++) {
      const argAst = ast[i];
      const isKwarg =
        Array.isArray(argAst) &&
        argAst.length === 3 &&
        argAst[0] === "=" &&
        typeof argAst[1] === "string";

      if (isKwarg) {
        allArgs.push({
          originalIndex: i,
          kind: "kwarg",
          name: argAst[1],
          ast: argAst[2],
        });
      } else {
        allArgs.push({
          originalIndex: i,
          kind: "positional",
          positionalIndex: positionalIndex++,
          ast: argAst,
        });
      }
    }

    // Step 2: Match template varnames to arguments
    // Build: templateSlots[i] = reference to allArgs entry (or undefined if missing)
    const templateSlots = [];
    const usedIndices = new Set();

    for (const name of varnames) {
      // First try to find by kwarg name
      const kwargMatch = allArgs.find(
        (a) => a.kind === "kwarg" && a.name === name && !usedIndices.has(a.originalIndex)
      );
      if (kwargMatch) {
        templateSlots.push({ ...kwargMatch, templateName: name });
        usedIndices.add(kwargMatch.originalIndex);
      } else {
        // Take next unused positional
        const positionalMatch = allArgs.find(
          (a) => a.kind === "positional" && !usedIndices.has(a.originalIndex)
        );
        if (positionalMatch) {
          templateSlots.push({ ...positionalMatch, templateName: name });
          usedIndices.add(positionalMatch.originalIndex);
        } else {
          // Missing argument
          templateSlots.push({ templateName: name, ast: undefined, originalIndex: -1 });
        }
      }
    }

    // Step 3: Remaining args (positional not used by template)
    const remainingPositional = allArgs.filter(
      (a) => a.kind === "positional" && !usedIndices.has(a.originalIndex)
    );

    // Step 4: Remaining kwargs (not used by template)
    const remainingKwargs = allArgs.filter(
      (a) => a.kind === "kwarg" && !usedIndices.has(a.originalIndex)
    );

    // Step 5: Determine type for each argument and collect items to evaluate
    // We need to evaluate in original order, so collect all non-fn items with their originalIndex
    const toEvaluate = []; // { originalIndex, ast, target, targetKey }

    // Mark template slots
    for (let i = 0; i < templateSlots.length; i++) {
      const slot = templateSlots[i];
      const type = getType(slot.templateName);
      slot.type = type;

      if (type !== "fn" && slot.ast !== undefined) {
        toEvaluate.push({
          originalIndex: slot.originalIndex,
          ast: slot.ast,
          target: "template",
          targetIndex: i,
        });
      }
    }

    // Mark remaining positional
    for (let i = 0; i < remainingPositional.length; i++) {
      const arg = remainingPositional[i];
      toEvaluate.push({
        originalIndex: arg.originalIndex,
        ast: arg.ast,
        target: "remaining",
        targetIndex: i,
      });
    }

    // Mark remaining kwargs
    for (let i = 0; i < remainingKwargs.length; i++) {
      const arg = remainingKwargs[i];
      const type = getType(arg.name);
      arg.type = type;

      if (type !== "fn") {
        toEvaluate.push({
          originalIndex: arg.originalIndex,
          ast: arg.ast,
          target: "kwarg",
          targetIndex: i,
        });
      }
    }

    // Step 6: Sort by originalIndex and evaluate in order
    toEvaluate.sort((a, b) => a.originalIndex - b.originalIndex);

    const evaluatedValues = [];
    for (let i = 0; i < toEvaluate.length; i++) {
      const item = toEvaluate[i];
      item.evalIndex = i;
      evaluatedValues.push(EVAL(item.ast, ctx, opt));
    }

    // Step 7: Use unbox to handle Promises/Streams
    return unbox(
      evaluatedValues,
      (unboxed) => {
        // Rebuild template args
        const finalTemplateArgs = templateSlots.map((slot) => {
          if (slot.type === "fn") {
            const capturedAst = slot.ast;
            return () => EVAL(capturedAst, ctx, opt);
          }
          if (slot.ast === undefined) {
            return undefined;
          }
          const evalItem = toEvaluate.find(
            (e) => e.target === "template" && e.targetIndex === templateSlots.indexOf(slot)
          );
          return unboxed[evalItem.evalIndex];
        });

        // Rebuild remaining args
        const finalRemainingArgs = remainingPositional.map((arg) => {
          const evalItem = toEvaluate.find(
            (e) => e.target === "remaining" && e.targetIndex === remainingPositional.indexOf(arg)
          );
          return unboxed[evalItem.evalIndex];
        });

        // Rebuild kwargs
        const finalKwargs = {};
        for (const arg of remainingKwargs) {
          if (arg.type === "fn") {
            const capturedAst = arg.ast;
            finalKwargs[arg.name] = () => EVAL(capturedAst, ctx, opt);
          } else {
            const evalItem = toEvaluate.find(
              (e) => e.target === "kwarg" && e.targetIndex === remainingKwargs.indexOf(arg)
            );
            finalKwargs[arg.name] = unboxed[evalItem.evalIndex];
          }
        }

        return fn.apply(this, [...finalTemplateArgs, finalRemainingArgs, finalKwargs]);
      },
      opt?.streamAdapter
    );
  }

  varargHandler.__isSpecialForm = true;
  return varargHandler;
}
