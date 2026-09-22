
/**
 * @typedef {Object} EvalOptions
 * @property {boolean=}       resolveString Возвращать имя переменной в слечае, если переменная не определена.
 *
 *                                          `lpe 'x' -> string 'x' (если x не определена)`
 *
 * @property {number=}        disallowLibFunctionsGetting Запретить получать функцию из библиотеки как переменную.
 * @property {boolean=}       wantCallable Указание для resolver функций, что мы ищем функцию.
 *
 * @property {any=}           streamAdapter Есть ли какая-нибудь библиотека для стриминга, чтобы LPE мог её использовать.
 * @property {boolean=}       squareBrackets Использовать ли квадратные скобки как строковые литералы.
 *
 *                                           `lpe '[test string]' => AST ["[]", "test string"]`
 *
 * @property {boolean=}       debug Выводить ли отладочную информацию.
 *                                - Включить ли определение метаинформации при вычислении AST дерева
 *
 * @property {ASTMeta=}       sourceMeta Метаинформации об исходном коде AST дерева. Присутствует только при включенном debug режиме.
 * @property {number=}        maxLoopIterations Максимальное количество итераций в циклах.
 */



 /**
  * @typedef {Object} VarSearchOptions
  * @property {number} evalFrom С какого индекса начинать поиск функции (для Skip Form)
  * @property {number} currentCtxElement Индекс текущего элемента контекста
  */



/**
 * Мета информация про вычисленное AST дерево, указывающее, в каком контексте существовало исходное выражение
 *
 * @typedef {Object} ASTMeta
 * @property {string}                 source Исходная строка
 * @property {ASTMeta=}               outerMeta Мета информация про внешнее AST дерево, если это вложенная функция
 * @property {[number, number]}       position Позиция в исходной строке вместе с аргументами
 * @property {[number, number]}       keyPosition Позиция имени функции в исходной строке
 * @property {[number, number][]=}    mulpiplePosition Позиции всех операторов для множественного оператора (a.b.c.d)
 * @property {[number, number]=}      keyClosurePosition Позиция закрывающей скобки для аргументов
 * @property {[number, number][]=}    argsPositions Позиции всех аргументов
 */



/**
 * Значение AST узла
 * @typedef {any} ASTValue
 */

/**
 * AST узел, где первый элемент - имя функции, а остальные - аргументы.
 * @typedef {[string, ...ASTValue] & ASTMeta} ASTNode
 */

/**
 * AST дерево. Может быть как просто значением, так и целым делевом.
 * @typedef {ASTValue & ASTNode} AST
 */



/**
 * Настраиваемое AST функции
 *
 * Как это работает:
 *
 * Если функция помечена как Macro:
 * - Функция вызывается. В нее передаются AST ее аргументов.
 * - Результат этой функции - новый AST, который будет выполнен вместо текущего.
 * - Новый AST будет также проверен на marco.
 * - Первые 3 элемента массива будут проигнорированы.
 *
 * Если функция не помечена как Macro:
 * - Функция НЕ будет вызвана.
 * - В качестве новой AST будет использован 0-й элемент массива.
 * - В качестве нового контекста выполнения будет использован 1-й элемент массива.
 * - Выполненные аргументы текущей функции будут записаны в переменные под именами, указанными во 2-м элементе массива.
 * - Если в качестве имени переменной указан '&', то оставшиеся аргументы будут записаны как массив в переменную, имя которой записано в следующем элементе.
 *
 * Например:
 *
 * Мы хотим вызвать `add(1,2,3,4,5)`.
 * В этой функции указан `ast = [["minus", a, b], ctx, ["a", "b", "&", "others"]]`.
 *
 * Тогда вызовется функция `minus` в контексте `ctx`, с аргументами `1` и `2` (они будут извлечены из переменных `a` и `b`).
 * При этом будет также существовать переменная `others = [3, 4, 5]`.
 *
 *
 * @typedef {[ASTNode | [], Context, Array<string>, number | boolean | undefined]} FunctionCustomAST
 *
 * @property {ASTNode} 0 - Какую AST необходимо выполнить вместо текущего
 * @property {Context} 1 - В каком контексте выполнить новое AST
 * @property {Array<string>} 2 - Имена переменных, в которые необходимо записать аргументы текущей функции
 * @property {number=} 3 - Является ли функция Macro
 */


/**
 * Параметры контекстной функции указывающие на тип этой функции
 * @typedef {Object} ContextFunctionParams
 * @property {string=} lpeName Наиболее подходящее имя функции
 * @property {ContextFunctionDoc=} _doc Документация функции
 * @property {boolean=} __isSpecialForm Является ли функция Special Form
 * @property {FunctionCustomAST=} ast Настраиваемое AST функции
 * @property {Array<[ContextFunction, string]>=} __associatedFunctions Список связанных функций для их именования
 * @property {Array<string>=} __docTags Список тэгов, которые нужно добавить в документацию
 * @property {ContextFunction=} __docFunction Функция, содержащая документацию, которая может быть обернута в другую функцию (vararg и т.д.)
 */


 /**
  * Контекстная функция
  * @callback RegularFuncSpec
  * @param {...any} args Аргументы функции
  * @returns {any} Результат выполнения функции
  */

 /**
  * Special Form функция
  * @callback SFSpec
  * @param {AST} ast AST функции
  * @param {Context} ctx Контекст выполнения
  * @param {EvalOptions} rs Опции выполнения
  * @param {AST=} fullAst Полный AST функции (вместе с именем функции в первом аргументе)
  * @returns {any} Результат выполнения функции
  */

 /**
  * Macro функция
  * @callback MacroSpec
  * @param {...AST} ast АСТ функции
  * @returns {AST[]} Результат выполнения функции
  */

 /**
  * Vararg функция
  * @callback VarargSpec
  * @param {...any} promptedArgs Аргументы функции, которая она запросила в шаблоне makeVararg
  * @param {Array<any>} args Прочие позиционные аргументы
  * @param {Record<string, any>} kwargs Прочие именованные аргументы
  * @returns {any} Результат выполнения функции
  */


/**
 * Контекстная функция
 * @typedef {RegularFuncSpec & ContextFunctionParams} ContextFunction
 */

/**
 * Special Form функция
 * @typedef {SFSpec & ContextFunctionParams} SpecialFormFunction
 */

/**
 * Macro функция
 * @typedef {MacroSpec & ContextFunctionParams} MacroFunction
 */

/**
 * Vararg функция
 * @typedef {VarargSpec & ContextFunctionParams} VarargFunction
 */



/**
 * Функция-ресолвер контекста
 * @callback ContextResolverFunction
 * @param {string} key - Имя переменной или функции, которую мы ищем
 * @param {any} value - Значение, которое мы хотим присвоить переменной. Если мы хотим получить значение, то value будет undefined
 * @param {EvalOptions} rs
 * @returns {any} Результат. При возврате undefined, считается, что функция отработала отрицательно и необходимо искать далее по контексту
 */



/**
 * @typedef {Record<string | symbol, ContextFunction | any>} ContextObject
 */
/**
 * @typedef {Record<string | symbol, ContextFunction>} ContextFunctionsObject
 */


/**
 * Объект, может быть одним из:
 * - Массив контекстов
 * - Объект ключ-значение, в котором лежат именованные контекстные функции или переменные
 * - Функция-ресолвер, принимающая ключ и возвращающая значение
 * @typedef {ContextObject | ContextResolverFunction | Array<any>} Context
 */


 /**
  * Массив, ассоциативный массив или объект
  * @typedef {Record<string, *>} ObjectLike
  */



//////////////////////////////////
//////////////////////////////////
// DOC
//////////////////////////////////
//////////////////////////////////

/**
 * @typedef {Record<LocaleName, ContextDocData | undefined>} ContextFunctionDoc
 */


/**
 * @typedef {Object} ContextDocData
 *
 * @property {number} index
 * @property {string} source
 * @property {string} description
 * @property {ContextDocUsage[]} usages
 * @property {string[]} results
 * @property {Array<ExampleObject[]>} examples
 * @property {string[]} examplesSources
 * @property {string[]} tags
 * @property {string[]} category
 * @property {Flavor[]} support
 * @property {string[]} [names]
 * @property {SQLizeData[]} [sqlize]
 */


/**
 * @typedef {Object} ContextDocUsage
 *
 * @property {string} usage
 * @property {ContextDocParam[]} params
 */


/**
 * @typedef {Object} ContextDocParam
 *
 * @property {string} name
 * @property {string} type
 * @property {string} description
 */


/**
 * @typedef {Object} SQLizeData
 *
 * @property {Array<boolean>} argsType
 * @property {boolean} returnType
 */

/**
 * @typedef {Object} ExampleObject
 *
 * @property {string} body
 * @property {string} result
 * @property {string[]} comments
 */


/** @typedef {string} ContextName */
/** @typedef {string} FunctionName */
/** @typedef {string} LocaleName */
/** @typedef {string} Flavor Имя СУБД */
