const lpe = require('../dist/lpe');
const child_process = require('child_process');
const fs = require('fs');
// @ts-ignore
const Diff = require('diff');


function showHelp() {
  console.log(`
Проверить актуальность локализации документации и исправить её.

Принудительно завершить процесс можно с помощью Ctrl+C или написав !q первыми символами во временном файле.
При этом текущий прогресс локализации сохраняется в abortFile.


Использование:

  yarn localize [-- options]


Примеры:

  yarn localize                                         Запустить проверку, используя vim-editor

  yarn localize -- -e code                              Запустить проверку, используя VS Code

  yarn localize -- -e nano -t /tmp/loc_tmp.txt          Запустить проверку, используя nano-editor,
                                                        сохраняя промежуточный результат для редактирования в /tmp/loc_tmp.txt


Опции:
  -h, --help                    Показать эту справку
  -e, --editor=<editor>         Редактор для редактирования локализации
                                (vim, code, nano, subl, atom, zed, emacs, notepad, notepad++)
                                По умолчанию: vim

  -t, --tmpFile=<path>          Путь к временному файлу для редактирования
                                По умолчанию: /tmp/localization_<timestamp>_<random>.txt

  -a, --abortFile=<path>
                                Путь для сохранения локализации при принудительном выходе (Ctrl+C)
                                По умолчанию: /tmp/loc.txt

  -с, --context=name:path       Пути к файлам локализации
                                Можно указать несколько контекстов
                                По умолчанию путь указан только для STDLIB как src/localization/localization.js
                                Пример: --context=STDLIB:src/localization/localization.js
                                        -c STDLIB:src/localization/localization.js -c calendar:src/localization/calendar.js

  -s, --spaces=<number>         Количество пробелов перед внешним хэшмапом локализации
                                По умолчанию: 0

  -u, --auto-hash-update        Автоматическое обновление локализации в случае, если необходимо только обновить хэш
`);
}

const flagKeys = [
  "u", "h"
];



lpe.LOCALIZATION_OPTIONS.modules = { child_process, fs, diff: Diff };

lpe.LOCALIZATION_OPTIONS.editor = "vim";



for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];

  let key, value;
  if (arg.startsWith("--")) {
    [key, value] = arg.slice(2).split("=");
  } else if (arg.startsWith("-")) {
    key = arg.slice(1);
    if (!flagKeys.includes(key)) {
      value = process.argv[i + 1];
      i++;
    }
  } else {
    continue;
  }

  switch (key) {
    case "h":
    case "help":
      showHelp();
      process.exit(0);

    case "e":
    case "editor":
      lpe.LOCALIZATION_OPTIONS.editor = value;
      break;

    case "t":
    case "tmpFile":
      lpe.LOCALIZATION_OPTIONS.tmpFile = value;
      break;

    case "a":
    case "abortFile":
      lpe.LOCALIZATION_OPTIONS.abortFile = value;
      break;

    case "c":
    case "context": {
      const [ctx, ...path] = value.split(":");
      lpe.LOCALIZATION_OPTIONS.paths[ctx] = path.join(":");
      break;
    }

    case "s":
    case "spaces":
      lpe.LOCALIZATION_OPTIONS.localizationHashmapStartSpaces = +value;
      break;

      case "u":
      case "auto-hash-update":
        lpe.LOCALIZATION_OPTIONS.autoHashUpdate = true;
        break;
  }
}



process.on('SIGINT', () => {
  console.log('Получен сигнал Ctrl+C. Выходим...');
  lpe.LOCALIZATION_OPTIONS.forceExitCallback();
  process.exit(0);
});


lpe.localizationUpdate([lpe.STDLIB]);
