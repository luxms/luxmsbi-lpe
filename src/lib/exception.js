import { GLOBAL_CONTEXT } from './utils';

/**
 * @typedef {'SYSTEM_ERROR'
 * |'UNREACHABLE'
 * |'CONTEXT_NAME_UNDEFINED'
 * |'EXCEPRION_UNKNOWN_TYPE'
 * |'UNKNOWN_STRING_FLAGS'
 * |'LPE_VAR_SCOPE_NOT_FOUND'
 * |'LPE_VAR_NOT_FOUND'
 * |'LPE_VAR_NOT_DOT_ACCESSIBLE'
 * |'LPE_LEFT_ARG_MUST_BE_LVALUE'
 * |'LPE_FUNC_WRONG_ARGS_COUNT'
 * |'LPE_FUNC_WRONG_ARG_TYPE'
 * } ExceprionType
 */


 /**
  * @param {ExceprionType} type
  * @param  {...any} args
  * @returns {string}
  */
function getMessage(type, ...args) {
  let loc = GLOBAL_CONTEXT.LOC;
  if (EXCEPTION_LOCALES[GLOBAL_CONTEXT.LOC] === undefined) {
    loc = "en";
  }
  if (EXCEPTION_LOCALES[loc][type] !== undefined) {
    return EXCEPTION_LOCALES[GLOBAL_CONTEXT.LOC][type](...args);
  } else {
    return getMessage("EXCEPRION_UNKNOWN_TYPE");
  }
}



class LPEError {
  constructor(/** @type {string} */ message) {
    this.constructor.prototype.__proto__ = Error.prototype;
    Error.call(this);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
    // this.stack = (new Error()).stack;
  }
}



/**
 *
 * @param {ExceprionType} type
 * @param  {...any} args
 * @returns {Error}
 */
export function except(type, ...args) {
  const mess = getMessage(type, ...args);
  return new LPEError(mess);
}



/** @type {Record<ExceprionType, (...agrs: any) => string>} */
const ru = {
  UNREACHABLE: () =>
    `Недостижимая ошибка.`,
  SYSTEM_ERROR: (place) =>
    `Произошла системная ошибка в [${place}].`,
  CONTEXT_NAME_UNDEFINED: () =>
    `Имя контекста не определено. Функция ctx.$$CONTEXT_NAME$$ не предоставлена.`,
  EXCEPRION_UNKNOWN_TYPE: () =>
    `Невозможно выбросить исключение: неизвестный тип ошибки.`,
  UNKNOWN_STRING_FLAGS: (prefix) =>
    `Неизвестные флаги строки: [${prefix}].`,
  LPE_VAR_SCOPE_NOT_FOUND: () =>
    `Не найден допустимый объект контекста для создания новой переменной.`,
  LPE_VAR_NOT_FOUND: (varName) =>
    `Не найдена переменная [${varName}].`,
  LPE_VAR_NOT_DOT_ACCESSIBLE: (val) =>
    `Объект [${val}] с типом [${typeof val}] не доступен для обращения через точку.`,
  LPE_LEFT_ARG_MUST_BE_LVALUE: (funcName) =>
    `Первый аргумент функции [${funcName}] должен быть lvalue.`,
  LPE_FUNC_WRONG_ARGS_COUNT: (funcName, expectedMinCount, expectedMaxCount, actualCount) =>
    `Неверное количество аргументов функции [${funcName}]: ожидается ` +
    (expectedMinCount === expectedMaxCount ? expectedMinCount : `от ${expectedMinCount} до ${expectedMaxCount}`) +
    `, получено [${actualCount}].`,
  LPE_FUNC_WRONG_ARG_TYPE: (funcName, argName, expectedType, actualType) =>
    `Неверный тип аргумента [${argName}] функции [${funcName}]: ожидается [${expectedType}], получен [${actualType}].`,
};


/** @type {Record<ExceprionType, (...agrs: any) => string>} */
const en = {
  UNREACHABLE: () =>
    `Unreachable error.`,
  SYSTEM_ERROR: (place) =>
    `A system error occurred in [${place}].`,
  CONTEXT_NAME_UNDEFINED: () =>
    `Context name getter ctx.$$CONTEXT_NAME$$ is undefined.`,
  EXCEPRION_UNKNOWN_TYPE: () =>
    `Unable to throw exception: unknown error type.`,
  UNKNOWN_STRING_FLAGS: (prefix) =>
    `Unknown string flags: [${prefix}].`,
  LPE_VAR_SCOPE_NOT_FOUND: () =>
    `No valid context object found for creating a new variable.`,
  LPE_VAR_NOT_FOUND: (varName) =>
    `No variable [${varName}] found.`,
  LPE_VAR_NOT_DOT_ACCESSIBLE: (val) =>
    `Object [${val}] with type [${typeof val}] is not dot-accessible.`,
  LPE_LEFT_ARG_MUST_BE_LVALUE: (funcName) =>
    `First argument of function [${funcName}] must be lvalue.`,
  LPE_FUNC_WRONG_ARGS_COUNT: (funcName, expectedMinCount, expectedMaxCount, actualCount) =>
    `Wrong number of arguments for function [${funcName}]: expected ` +
    (expectedMinCount === expectedMaxCount ? expectedMinCount : `from ${expectedMinCount} to ${expectedMaxCount}`) +
    `, got [${actualCount}].`,
  LPE_FUNC_WRONG_ARG_TYPE: (funcName, argName, expectedType, actualType) =>
    `Wrong type of argument [${argName}] of function [${funcName}]: expected [${expectedType}], got [${actualType}].`,
};


/** @type {Record<string, Record<ExceprionType, function>>} */
export const EXCEPTION_LOCALES = {
  ru,
  en
};
