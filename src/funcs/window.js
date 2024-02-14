import {eval_lisp, isString, isArray, isHash, isFunction, makeSF, isNumber} from '../lisp';
import {generateAggContext} from './agg'

export function generateWindowContext(v){
  let _variables = v


  function init_nested_agg_context() {
    // agg_funcs === hashmap!
  
    let agg_funcs_hashmap = generateAggContext()
    let agg_funcs =
      {
        'count':null,
        'max':null,
        'min':null,
        'avg':null,
        'count':null,
        'uniq':null,
        'sum':null,
        ...agg_funcs_hashmap
      }

    let calculate = (args) => args.map(el => (isHash(el) && (el["🧮🎰🙉"] !== undefined)) ? el["🧮🎰🙉"] : 0)
    let bulbulate = (args) => args.length === 0 ? 0 : Math.max(...calculate(args))
  
    let ctx = (key, val, resolveOptions) => {
        if (resolveOptions && resolveOptions.wantCallable){
          if (agg_funcs[key] === undefined){
            return (...args) => {return {"🧮🎰🙉": bulbulate(args)}}
          } else {
            return (...args) => {return {"🧮🎰🙉": bulbulate(args) + 1}}
          }
        } else {
          return {"🧮🎰🙉":0}
        }
      }
  
    return ctx
  }

  let nested_agg_context = init_nested_agg_context()

  /* первый аргумент = это всегда должна быть функция. Например sum(dt).
     мы её должны вычислить вручную, но при этом мы должны удалить флаг agg!

     window(sum(dt), partition("dt","col"), order("-dt","col"), frame(null, 'current'))
  */

  // задача просто сгенерить PARTITION BY ...
  let partition = function() {
    // пока что наивно... но надо будет добавить 
    // возможность поиска АЛИАСОВ!!!
    var a = Array.prototype.slice.call(arguments)
    return `PARTITION BY ${a.join(',')}`
  }


  // задача просто сгенерить ORDER BY ...
  let order = function() {
    // пока что наивно... но надо будет добавить 
    // возможность поиска АЛИАСОВ!!!
    var a = Array.prototype.slice.call(arguments)
    return `ORDER BY ${a.join(',')}`
  }

  let frame = function(s,e) {
    throw Error(`frame() is not yet implemented`) 
  }



  let window = makeSF((ast, ctx, rs) => {
    if (!isArray(ast[0])){
      throw Error(`window() first argument must be a function!`) 
    }

    // из-за хорошо выбранных имён вложенных функций, у нас будет правильный порядок:
    // partition(), order(), frame() !!!
    let args = ast.slice(1).sort((a,b)=> String(b[0]).localeCompare(String(a[0])))

    // вычисляем первый аргумент, это типа функция
    let nested_count = eval_lisp(ast[0], nested_agg_context)
    nested_count = nested_count["🧮🎰🙉"]

    let func_text = eval_lisp(ast[0], ctx)

    //console.log(`WINDOW: + ${func_text} AGG: ${nested_count}`)

    function over() {
      let context = [
        {
          "partition": partition,
          "order": order,
          "frame": frame
        },
        ctx
      ]
      let ret = args.map(el=>{
        let result
        if (el[0] === 'order') {
          let orderContext = [{
                "+": makeSF( (ast) => {
                  return eval_lisp(ast[0], context)
                }),
              
                "-" : makeSF( (ast) => {
                  return `${eval_lisp(ast[0], context)} DESC`
                })
              },
              context
          ]
          return eval_lisp(el, orderContext)
        } else {
          return eval_lisp(el, context)
        }
      }).join(' ')

      return ret
    }

    // FIXME!!! и ещё заполнить result!!!! если он есть !!! 
    let sql = `${func_text} OVER (${over()})`


    // если вложенность вызова agg функций > 1 sum(sum(v)), то будет нужен GROUP BY, а мы являемся measure
    // иначе мы просто столбец...
    if (nested_count > 1) {
      _variables["_result"]["agg"] = true
    } else {
      delete _variables["_result"]["agg"] // мы точно не агрегат, хотя были вызовы Agg функций 
    }
    // console.log(`AGG: ${_variables["_result"]["agg"]}`)
    // FIXME: кажется это уже не надо, НО по нашему столбцу может быть попытка сделать агрегат
    // _variables["_result"]["do_not_group_by"] = true


    // FIXME: сначала нужно очистить код от старого running()
    //_variables["_result"]["window"] = true
    return sql
  })

 


  return {
    'window': window
  }
              
}
