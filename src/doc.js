
/**
 * Как это работает:
 *
 * При составлении контекста формируется документация для функций
 * и записывается в _doc как ContextDocData структура
 *
 * В начале функции самым первым комментарием после открытия фигурной скобки
 * должен быть комментарий документации следующего формата:
 *
 * / **
 *  * Описание функции.
 *  * Может быть многострочным.
 *  *
 *  * На него накладываются ограничения и возможности `markdown`
 *  * @usage func(arg, ...addargs)
 *  * @param arg [type] Описание аргумента
 *  * @param addargs [type2] Описание аргумента из массива
 *  * @usage func()          // Может быть несколько описаний, для каждого нужно указывать описание всех аргументов
 *  *
 *  * @result Опциональное описание результата.
 *  * @example func(1, 2, 3) ## Пример. Тект после `##` является комментарием.
 *  * @example func() => 100 ## Можно указывать результат функции
 *  * @example func()
 *  *            ## Можно также делать
 *  *            ## многострочные комментарии
 *  *          func(1) => 2
 *  *            ## Или по несколько комментариев в одном example
 *  * @example func(\
 *  *          |  1,\
 *  *          |  2\
 *  *          )
 *  *          ## Можно также делать многострочный пример, добавляя `\` в конец строки.
 *  *          ## Чтобы сохранить начальные пробелы можно добавлять `|` в начало. Этот символ будет удалён.
 *  * @support postgresql clickhouse oracle
 *  * @tags tag1 tag2
 *  * @category Категория | 1
 *  * @sqlize (1, 0) => 1 | (1) => 1 | () => 0
 *  *
 *  * /
 *
 * Обязательные тэги:
 * - usage
 *
 * При указании типа аргумента в документации оно превращается в ссылку на документацию типа.
 *
 * В support перечисляются базы, для которых реализована функция. Можно указать `*`, если реализация доступна для всех баз.
 *
 * В tags указываются дополнительные тэги:
 * - hidden: Функция будет скрыта из документации
 *
 * В category указывается название пункта и порядок сортировки функции при сборке документации
 *
 * В sqlize указывается "эскулизация" параметров и результата функции. Необходимо для генерации SQL запроса.
 * Можно указывать несколько типов через `|`. Будет выбран тот, который совпадает по количеству аргументов.
 * - Если мы говорим, что функция принимает НЕsqlized аргумент, он не будет никак видоизменен.
 * - Если мы говорим, что функция принимает sqlized аргумент, то, если придёт значение, не помеченное, как sqlized, оно берется в кавычки.
 * - Если в качестве результата `1`, результирующее значение помечается как sqlized
 * Данная логика работает только в SQL контексте
 */




/**
 * @typedef {Object} ContextDocData
 *
 * @property {number} index
 * @property {string} source
 * @property {string} description
 * @property {ContextDocUsage[]} usages
 * @property {string[]} results
 * @property {string[]} examples
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
 * Выполняет matchAll для строки.
 *
 * plv8 не поддерживает функцию matchAll, а match(/__/g) не возвращает группы.
 * @param {string} str
 * @param {RegExp} reg Регулярное выражение без `g`
 * @returns {Array<RegExpMatchArray> | null}
 */
export function matchAllPlv8(str, reg) {
  let exprs = str.match(RegExp(reg, "g"));
  if (exprs === null) {
    return null;
  }
  return exprs.map(el => el.match(reg)).filter(el => el !== null);
}



/**
 * Парсит значение `@param` параметра
 * @param {string} paramString
 * @return {ContextDocParam}
 */
function parseParamParam (paramString) {
  // "name [type] description"
  let param = paramString.match(/\s*(\w*)\s*(\[(.*?)\])?\s*(.*)/);
  if (param === null) {
    return {
      name: "??",
      type: "UNKNOWN",
      description: paramString,
    }
  }
  return {
    name: param[1].trim(),
    type: param[3]?.trim(),
    description: param[4].trim(),
  }
}



/**
 *
 * @param {string} sqlizeString
 * @returns {Array<SQLizeData>}
 */
function parseParamSqlize (sqlizeString) {
  return sqlizeString.split("|")
    .map(el => el.match(/\((.*)\)\s*=>\s*(\d+)/))
    .filter(el => el !== null)
    .map(el => {
      return {
        argsType: el[1].split(",").map(e => e.trim()).filter(e => e != "").map(e => e != "0"),
        returnType: el[2] != "0",
      };
    });
};



/**
 * Добавляет данные дополнительных строк, если параметр многострочный
 * @param {string} paramName
 * @param {string} newLine
 * @param {ContextDocData} doc
 */
function addLineForDocParam(paramName, newLine, doc) {
  switch (paramName) {
    case "description":
      doc.description += `\n${newLine}`;
      break;

    case "usage":
      doc.usages[doc.usages.length - 1].usage += `\n${newLine}`;
      break;

    case "param":
      const usg = doc.usages[doc.usages.length - 1]; usg.params[usg.params.length - 1].description += `\n${newLine}`;
      break;

    case "result":
      doc.results[doc.results.length - 1] += newLine.startsWith("##") ? ` ${newLine}` : `\n${newLine}`;
      break;

    case "example":
            const cur = doc.examples[doc.examples.length - 1];
      doc.examples[doc.examples.length - 1] =
          newLine.startsWith("##") ? `${cur} ${newLine}`
        : cur.endsWith("\\") ? `${cur.slice(0, -1)}{\\n}${newLine}` : `${cur}\n${newLine}`
      break;

    case "tags":
      doc.tags.push(...newLine.split(" ").filter(el => el !== ""));
      break;

    case "category":
      doc.category.push(...newLine.split("|").map(el => el.trim()).filter(el => el !== ""));
      break;

    case "support":
      doc.support.push(...newLine.split(" ").filter(el => el !== ""));
      break;

    case "sqlize":
      doc.sqlize?.push(...parseParamSqlize(newLine));
      break;

    default:
      break;
  };
}



/**
 * Устанавливает значение параметра
 * @param {string} paramName
 * @param {string} value
 * @param {ContextDocData} doc
 * @param {string} fullComment
 */
function setDocParam(paramName, value, doc, fullComment) {
  switch (paramName) {
    case "usage":
      doc.usages.push({ usage: value, params: [] });
      break;

    case "param":
      if (doc.usages.length > 0) {
        doc.usages[doc.usages.length - 1].params.push(parseParamParam(value))
      }
      break;

    case "result":
      doc.results.push(value);
      break;

    case "example":
      doc.examples.push(value);
      break;

    case "tags":
      doc.tags = value.split(" ").filter(el => el !== "");
      break;

    case "category":
      doc.category = value.split("|").map(el => el.trim()).filter(el => el !== "");
      break;

    case "support":
      doc.support = value.split(" ").filter(el => el !== "");
      break;

    case "sqlize":
      doc.sqlize = parseParamSqlize(value);
      break;

    default:
      console.log(`Unknown doc parameter: ${paramName} at: \n/**${fullComment}*/\n`);
  };
}



/**
 * Парсит весь комментарий документации
 * @param {string} docComment
 * @returns {ContextDocData}
 */
function parseDocstring(docComment) {
  let index = 0;
  if (parseDocstring.index === undefined) {
    parseDocstring.index = 0;
  }
  index = ++parseDocstring.index;

  // Получить все строки комментария, образав начальную `*`
  /** @type {Array<string>} */
  let docs = [...(matchAllPlv8(docComment, /[ \t]*\*?[ \t]?([^\n]*)(\n|$)/)?.map(el => el[1]) || [])];

  /** @type {ContextDocData} */
  let doc = {
    index: index,
    source: docComment,
    description: "",
    usages: [],
    results: [],
    examples: [],
    tags: [],
    category: [],
    support: [],
  };


  let descContext = "description";

  for (let docstring of docs) {
    let param = docstring.match(/^@(\w+)\s*(.*)/);
    if (param === null) {
      const val = docstring.trim();
      addLineForDocParam(descContext, val.startsWith("|") ? " " + val.slice(1) : val, doc);
    } else {
      descContext = param[1];
      setDocParam(param[1], param[2], doc, docComment);
    }
  }

  doc.description = doc.description.trim();
  doc.results = doc.results.map(el => el.trim());
  doc.examples = doc.examples.map(el => el.trim());
  doc.usages.forEach(usg => {
    usg.usage = usg.usage.trim();
    usg.params.forEach(prm => {
      prm.description = prm.description.trim();
    })
  })
  if (doc.support.length === 0) {
    doc.support.push("*");
  }
  return doc;
}



/**
 * Вычисляет комментарий из первого аргумента-функции и подставляет его как `_doc` параметр во второй аргумент.
 *
 * Если второй аргумент отсутствует, документация подставляется к первой функции.
 * @param {Function} docSource Функция, в начале тела которой находится комментарий к функции
 * @param {Function} [func] Функция, которую необходимо вернуть в качестве результата
 * @returns {any}
 */
export function makeDoc(docSource, func) {
  let docValue = docSource.toString().match(/\{\s*\/\*\*([\s\S]*?)\*\//);
  let res = func === undefined ? docSource : func;
  if (docValue !== null) {
    // @ts-ignore
    res._doc = parseDocstring(docValue[1]);
  }
  return res;
}
