/* eslint-disable no-console */
import { isArray, isFunction, isHash } from './utils.js';
import { generateSimpleHash, matchAllPlv8 } from './doc.js';


// TODO: Добавить автообнаружение редактора

/**
 * @typedef {Object} EditorConfig
 * @property {'tab'|'window'} behavior Ожидает закрытия окна или вкладки
 * @property {string} [waitFlag] Флаг ожидания, если нужен
 */

/**
 * @typedef {Object} LocalizationOptions
 * @property {Record<string, string>} paths
 * @property {string} tmpFile
 * @property {string} editor
 * @property {Record<string, EditorConfig>} editorsInfo
 * @property {Array<string>} languages
 * @property {number} localizationHashmapStartSpaces Сколько пробелов стоит перед внешним хэшмапом
 * @property {() => void} forceExitCallback
 * @property {string} abortFile Путь к файлу, в которую сохранится локализация при forceExits
 * @property {Record<string, any>} modules Модули Node.js
 */

 /**
  * Текст комментариев по языкам.
  *
  * Также присутствует поле `hash`, в котором хранится хэш по `ru` комментарию.
  *
  * Тело комментария не содержит `/ **`, `* /` и `* ` перед каждой строкой. Содержит только полезный текст комментария.
  * @typedef {Record<string, string>} LocalizedData
  */



/** @type {LocalizationOptions} */
export const LOCALIZATION_OPTIONS = {
  "paths": {
    "STDLIB": "src/localization/localization.js",
  },

  "tmpFile": `/tmp/localization_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.txt`,

  "editor": "vim",
  "editorsInfo": {
    // Graphic editors
    'code': { behavior: 'tab', waitFlag: '--wait' },
    'subl': { behavior: 'tab', waitFlag: '-w' },
    'atom': { behavior: 'window', waitFlag: '--wait' },
    'zed': { behavior: 'tab', waitFlag: '--wait' },
    // Ter
    'vim': { behavior: 'window' },
    'nano': { behavior: 'window' },
    'emacs': { behavior: 'window' },
    // Windows
    'notepad': { behavior: 'window' },
    'notepad++': { behavior: 'window' }
  },

  "languages": ["ru", "en"],

  "localizationHashmapStartSpaces": 0,

  "forceExitCallback": () => { currentForceExitCallback() },
  "abortFile": "/tmp/loc.txt",

  "modules": {
    "child_process": undefined,
    "fs": undefined,
    "diff": undefined,
  },

};


let currentForceExitCallback = () => { };


/**
 * @param {string} filePath
 */
async function openEditor(filePath) {
  const editorName = LOCALIZATION_OPTIONS.editor;
  const editorConfig = LOCALIZATION_OPTIONS.editorsInfo[editorName];
  if (!editorConfig) {
    throw new Error(`Unknown editor: ${editorName}`);
  }
  const { behavior, waitFlag } = editorConfig;
  console.log(`Open file with ${editorName}. Waiting for editor to close ${behavior}...`);
  const args = [
    waitFlag,
    filePath,
  ].filter(el => el !== undefined);

  return new Promise((resolve, reject) => {
    const child = LOCALIZATION_OPTIONS.modules.child_process.spawn(editorName, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    let resolved = false;

    child.on('exit', (/** @type {number} */ code) => {
      if (!resolved) {
        resolved = true;
        if (code === 0) {
          console.log("Editor closed successfully.");
          resolve(0);
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      }
    });

    child.on('error', (/** @type {Error} */ err) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to launch editor: ${err.message}`));
      }
    });
  });
}


/**
 *
 * @param {string} oldStr
 * @param {string} newStr
 * @returns
 */
function getWordDiff(oldStr, newStr) {
  // Разбиваем на слова и пробелы
  const tokenize = (/** @type {string} */ str) => {
    return str.match(/([^\s]+|\s+)/g) || [];
  };

  const oldWords = tokenize("\n" + oldStr.replaceAll("\r\n", "\n") + "\n");
  const newWords = tokenize("\n" + newStr.replaceAll("\r\n", "\n") + "\n");

  const diff = LOCALIZATION_OPTIONS.modules.diff.diffArrays(oldWords, newWords);

  let result = '';
  /** @type {Array<{ added: boolean; value: string[]; removed: boolean; }[]>} */ //Разбиваем на построчные diffs
  const splitted = [[]];
  diff.forEach((/** @type {{ added: boolean; value: string[]; removed: boolean; }} */ part) => {
    if (part.value.join("").includes("\n")) {
      splitted.push([part], []);
    } else {
      splitted[splitted.length - 1].push(part);
    }
  });

  splitted.filter(el => el.length > 0).forEach(partsArr => {
    if (partsArr.length > 4) {
      result += "[-" + partsArr.filter(part => !part.added).map(p => p.value.join("")).join("") + "-]" +
                "[+" + partsArr.filter(part => !part.removed).map(p => p.value.join("")).join("") + "+]";
    } else {
      partsArr.forEach(part => {
        if (part.added) {
          result += part.value.join('').split("\n").map((el, idx) => el === "" && idx === 0 ? "" : `[+${el}+]`).join("\n");
        } else if (part.removed) {
          result += part.value.join('').split("\n").map((el, idx) => el === "" && idx === 0 ? "" : `[-${el}-]`).join("\n");
        } else {
          result += part.value.join('').replace(/\n[\s\S]*\n/, "\n");
        }
      });
    }
  });

  return result;
}



/**
 * Вернуть текст файла для изменения
 * @param {string} actualText
 * @param {Record<string, string> | undefined} locData
 * @param {string} lpeName
 * @param {string} message
 */
function getTmpChangerFileText(actualText, locData, lpeName, message) {
  const sep = "/////////////////////////////////////////";
  const fileText = [`// ${message}`, `// ${lpeName}`];
  const newHash = String(generateSimpleHash(actualText));

  if (locData === undefined) {
    fileText.push(
      `// No localization data`,
      sep,
    );
    locData = {};
  } else if (locData["ru"] === actualText) {
    fileText.push(
      newHash == locData["hash"] ? `// No changes` : `// Update hash: ${locData["hash"]} => ${newHash}`,
      sep,
    );
  } else {
    fileText.push(
      `// Diffs:`,
      getWordDiff(locData["ru"] ?? "", actualText),
      sep,
    );
  }

  LOCALIZATION_OPTIONS.languages.forEach((lang) => {
    fileText.push(
      `// ${lang}`,
      lang === "ru" ? actualText : locData[lang],
      `// ${lang}`,
      sep,
    );
  });


  fileText.push(
    `// HASH: ${locData["hash"]} => ${newHash}`
  );

  if (locData["hash"] != newHash || actualText !== locData["ru"]) {
    return fileText.join("\n");
  }
}



/**
 *
 * @param {string} locText
 * @returns {LocalizedData}
 */
function extractLocalizationDataFromLocalization(locText) {
  const parts = locText.matchAll(/(\w+): (`[\s\S]*?(?<!\\)`|\d+)/g);
  /** @type {Record<string, string>} */
  const result = {};
  for (const part of parts) {
    if (part[1] === "hash") {
      result[part[1]] = part[2];
    } else {
      result[part[1]] = part[2].replaceAll(/\r?\n\s*(\* ?)?/g, "\n").slice(4, -3).trim().replaceAll("\\`", "`").replaceAll("\\\\", "\\");
    }
  }
  return result;
}




/**
 * Извлекает из контента временного файла локализацию для указанного LPE
 * @param {string} changedFileText
 * @returns {LocalizedData}
 */
function extractLocalizationDataFromTmpFile(changedFileText) {
  const locales = LOCALIZATION_OPTIONS.languages;
  const localesTexts = Object.fromEntries(
    locales.map(loc => {
      const m = changedFileText.match(new RegExp(String.raw`\n// ${loc}\r?\n([\s\S]*?)\r?\n// ${loc}`));
      return [loc, m === null ? "" : m[1].trim()];
    }).filter(([_, text]) => text !== "")
  );
  localesTexts["hash"] = generateSimpleHash(localesTexts["ru"]?.trim() || "");
  return localesTexts;
}



/**
 *
 * @param {Record<string, Record<string, string>>} localizations
 * @returns {string}
 */
function generateLocalizationHashData(localizations) {
  const s0 = Array.from({ length: LOCALIZATION_OPTIONS.localizationHashmapStartSpaces }, () => " ").join("");
  const s1 = `${s0}  `; // Пробелы перед именем контекста
  const s2 = `${s1}  `; // Пробелы перед именем функции
  const s3 = `${s2}  `; // Пробелы перед именем языка
  const s4 = `${s3}      `; // Пробелы перед телом комментария
  return Object.entries(localizations).sort((a, b) => a[0].localeCompare(b[0]))
    .map(([funcName, locs]) => {
      return `//#region ${funcName}\n` +
        `${s2}"${funcName}": {\n` +
        Object.entries(locs)
          .filter(([loc, _]) => loc !== "hash")
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([loc, text]) => [
            `${s3}${loc}: \`/**`,
            ...text.split("\n").map(line => `* ${line.replaceAll("\\", "\\\\").replaceAll("`", "\\`")}`),
            `*/\`,`,
          ].join(`\n${s4}`))
          .join("\n") + "\n" +
        `${s3}hash: ${locs.hash},\n` +
        `${s2}},\n` +
        `//#endregion ${funcName}\n`;
    })
    .join("\n\n\n\n");
}


/**
 *
 * @param {string} locFileText
 * @param {string} contextName
 * @param {ContextObject} context
 * @returns {Promise<string>}
 */
async function updateFile(locFileText, contextName, context) {
  const regContextData = new RegExp(String.raw`//#region ${contextName}\r?\n([\s\S]*?)//#endregion ${contextName}\r?\n`);
  const regFuncData = (/** @type {string} */ funcName) =>
    new RegExp(String.raw`//#region ${funcName}\r?\n([\s\S]*?)//#endregion ${funcName}\r?\n`);

  const localizationBlock = locFileText.match(regContextData);

  if (localizationBlock === null) {
    console.log(`No localization block found for [${contextName}]`);
    return locFileText;
  }

  /** @type {Record<string, LocalizedData>} */
  const newDoc = {};

  currentForceExitCallback = () => { LOCALIZATION_OPTIONS.modules.fs.writeFileSync(LOCALIZATION_OPTIONS.abortFile, generateLocalizationHashData(newDoc)); }

  const funcsCount = Object.keys(Object.fromEntries(Object.values(context).filter((obj) => isFunction(obj) && obj.lpeName !== undefined).map((obj) => [obj.lpeName, 0]))).length;

  /** @type {string[]} */
  const evaledFuncs = [];
  for (const [_, obj] of Object.entries(context)) {
    if (!isFunction(obj) || obj.lpeName === undefined) {
      continue;
    }
    if (evaledFuncs.includes(obj.lpeName)) {
      continue;
    }
    evaledFuncs.push(obj.lpeName);

    const currentLocalization = locFileText.match(regFuncData(obj.lpeName));

    /** @type {string} */
    const ruSrcInner = obj._doc?.ru?.source.replaceAll(/\r?\n\s*(\* ?)?/g, "\n").trim();

    if (ruSrcInner === undefined && currentLocalization === null) {
      console.log(`WARNING: localization and documentation not found for [${obj.lpeName}]`);
      continue;
    }

    const currentLoc = currentLocalization === null ? undefined : extractLocalizationDataFromLocalization(currentLocalization[1]);

    if (currentLoc !== undefined) {
      newDoc[obj.lpeName] = currentLoc;
    }

    // Если есть дока самой функции, то сравниваем с локализацией и создаем файл, чтобы открыть его в редакторе
    if (ruSrcInner === undefined) {
      continue;
    }
    const tmpText = getTmpChangerFileText(
      ruSrcInner,
      currentLoc,
      obj.lpeName,
      `${contextName}: ${evaledFuncs.length}/${funcsCount}`,
    );

    if (tmpText !== undefined) {
      console.log(`Updating ${obj.lpeName}...`);

      LOCALIZATION_OPTIONS.modules.fs.writeFileSync(LOCALIZATION_OPTIONS.tmpFile, tmpText);
      await openEditor(LOCALIZATION_OPTIONS.tmpFile);

      const updatedText = LOCALIZATION_OPTIONS.modules.fs.readFileSync(LOCALIZATION_OPTIONS.tmpFile, 'utf8');
      if (updatedText !== undefined) {
        newDoc[obj.lpeName] = extractLocalizationDataFromTmpFile(updatedText);
        console.log(`Success updating ${obj.lpeName}!`);
        if (updatedText.startsWith(`!q`)) {
          console.log(`Exit from process.`);
          LOCALIZATION_OPTIONS.forceExitCallback();
          process.exit(0);
        }
      }
    }
  }


  currentForceExitCallback = () => { };

  const spaces = ' '.repeat(LOCALIZATION_OPTIONS.localizationHashmapStartSpaces);
  return locFileText.replace(
    regContextData,
    `//#region ${contextName}\n` +
      `${spaces}  "${contextName}": {\n` +
      generateLocalizationHashData(newDoc).replaceAll("$", "$$$$") +
      `\n${spaces}},\n` +
      `//#endregion ${contextName}\n`,
  );
}



/**
 * @param {string} contextName
 * @param {ContextObject} ctx
 */
async function Update(contextName, ctx) {
  const locPath = LOCALIZATION_OPTIONS.paths[contextName];
  if (locPath === undefined || !LOCALIZATION_OPTIONS.modules.fs.existsSync(locPath)) {
    console.log(`No localization file found for [${contextName}]`);
    return;
  }
  const locFileText = LOCALIZATION_OPTIONS.modules.fs.readFileSync(locPath, 'utf8');

  const newFileText = await updateFile(locFileText, contextName, ctx);
  if (newFileText !== locFileText) {
    LOCALIZATION_OPTIONS.modules.fs.writeFileSync(locPath, newFileText);
  }
}


/** @param {*} ctx */
export async function localizationUpdate(ctx) {

  for (const module of ["child_process", "fs", "diff"]) {
    if (LOCALIZATION_OPTIONS.modules[module] === undefined) {
      console.log(`ERROR: Module [${module}] at LOCALIZATION_OPTIONS is not defined!`)
      return;
    }
  }

  /** @type {Record<string, ContextObject>} */
  const contextes = {};

  const addCtx = (/** @type {*} */ ctx) => {
    if (isHash(ctx)) {
      const name = ctx["$$CONTEXT_NAME$$"] === undefined ? undefined : ctx["$$CONTEXT_NAME$$"]();
      if (name !== undefined) {
        contextes[name] = ctx;
      }
    } else if (isArray(ctx)) {
      for (let subctx of ctx) {
        addCtx(subctx);
      }
    }
  }

  addCtx(ctx);
  for (const [name, ctx] of Object.entries(contextes)) {
    Update(name, ctx);
  }
}
