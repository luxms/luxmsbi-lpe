
$body$;
COMMENT ON FUNCTION lpe.init(JSON) IS
$$Инициализирует интерпретатор LISP для дальнейшего использования, на вход принимает настройки окружения для LISP.
Также инициализируется парсер LPE-выражений.
Перед использованием не забудьте подать SET plv8.start_proc = '"lpe"."init"'$$;

SELECT lpe.init();


CREATE OR REPLACE FUNCTION
lpe.parse(_expr TEXT)
RETURNS JSON
LANGUAGE 'plv8' STABLE
AS $body$
  var sexpr = plv8.lpe.parse(_expr);
  return sexpr;
$body$;

COMMENT ON FUNCTION lpe.parse(TEXT) IS
$$Parses text into AST$$;

/*********************************************************************************/

CREATE OR REPLACE FUNCTION lpe.eval(ast jsonb, context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plv8
 STABLE
AS $function$

  ret = plv8.lpe.evaluate(ast, context);

  if (typeof(ret) == "function") {
    /*plv8.elog(NOTICE, "RET = ", ret.toString());*/
    return '["function"]';
  } else {
    /*plv8.elog(NOTICE, "tp = ", typeof(ret));*/
    return ret;
  }

$function$;

COMMENT ON FUNCTION lpe.eval(ast jsonb, context jsonb) IS
$$Вычисляет выражение ast (в виде s-expr) и используя контекст со значениями переменных и функций.$$;

/*********************************************************************************/


CREATE OR REPLACE FUNCTION
lpe.eval_sql_where(_expr TEXT, _vars JSONB DEFAULT '{}')
RETURNS TEXT
LANGUAGE 'plv8' STABLE
AS $body$

  return plv8.lpe.eval_sql_where(_expr, _vars);

$body$;

COMMENT ON FUNCTION lpe.eval_sql_where(TEXT,JSONB) IS
$$Выполняет разбор LPE выражений в SQL шаблоне для генерации одиночного выражения where() или одиночного order_by().
Второй аргумент = это значения переменных для подстановки.$$;

/*********************************************************************************/

CREATE OR REPLACE FUNCTION
lpe.parse_sql_expr(_expr TEXT, _vars JSONB DEFAULT '{}')
RETURNS TEXT
LANGUAGE 'plv8' STABLE
AS $body$

  return plv8.lpe.parse_sql_expr(_expr, _vars);

$body$;

COMMENT ON FUNCTION lpe.parse_sql_expr(TEXT,JSONB) IS
$$Выполняет разбор LPE выражения и выдаёт SQL запрос в виде текста$$;