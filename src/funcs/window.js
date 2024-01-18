import {eval_lisp, isString, isArray, isHash, isFunction, makeSF, isNumber} from '../lisp';

export function generateWindowContext(v){
  let _variables = v

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
    let func_text = eval_lisp(ast[0], ctx)

    //console.log(`WINDOW: + ${func_text} AGG: ${_variables["_result"]["agg"]}`)
    delete _variables["_result"]["agg"]

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
    return sql
  })

 


  return {
    'window': window
  }
              
}
