import {eval_lisp, isString, isArray, isHash, isFunction, makeSF, isNumber} from '../lisp';



export function generateCalendarContext(v){
    let _variables = v

    function toFullUnit(u) {
        // clickhouse has lowercase names only
        if (/^'?\s*(?:y|year)\s*'?$/i.test(u)) {
            return 'year'
        }
        if (/^'?\s*(?:q|quarter)\s*'?$/i.test(u)) {
            return 'quarter'
        }
        if (/^'?\s*(?:m|month)\s*'?$/i.test(u)) {
            return 'month'
        }
        if (/^'?\s*(?:d|day)\s*'?$/i.test(u)) {
            return 'day'
        }
        if (/^'?\s*(?:w|week)\s*'?$/i.test(u)) {
            return 'week'
        }
    }

    function toSQLInterval(i, u) {
        if (/^'?\s*(?:y|year)\s*'?$/i.test(u)) {
            return `INTERVAL '${i} YEAR'`
        }
        if (/^'?\s*(?:q|quarter)\s*'?$/i.test(u)) {
            return `INTERVAL '${i}*3 MONTH'`
        }
        if (/^'?\s*(?:m|month)\s*'?$/i.test(u)) {
            return `INTERVAL '${i} MONTH'`
        }
        if (/^'?\s*(?:d|day)\s*'?$/i.test(u)) {
            return `INTERVAL '${i} DAY'`
        }
        if (/^'?\s*(?:w|week)\s*'?$/i.test(u)) {
            return `INTERVAL '${i} WEEK'`
        }
    }

    // End of Period
    function toSQLIntervalEOP(u) {
        if (/^'?\s*(?:y|year)\s*'?$/i.test(u)) {
            return `INTERVAL '1 YEAR - 1 DAY'`
        }
        if (/^'?\s*(?:q|quarter)\s*'?$/i.test(u)) {
            return `INTERVAL '3 MONTH - 1 DAY'`
        }
        if (/^'?\s*(?:m|month)\s*'?$/i.test(u)) {
            return `INTERVAL '1 MONTH - 1 DAY'`
        }
        if (/^'?\s*(?:d|day)\s*'?$/i.test(u)) {
            return `INTERVAL '1 DAY'` // need time precision....
        }
        if (/^'?\s*(?:w|week)\s*'?$/i.test(u)) {
            return `INTERVAL '1 WEEK - 1 DAY'`
        }
    }

    function toStart(one, two) {
        let unit
        let start
        if (two === undefined) {
            unit = one
            start= today()
        } else {
            start = one
            unit = two
        }
        if (_variables._target_database === 'clickhouse' ||
            _variables._target_database === 'postgresql' || 
            _variables._target_database === 'oracle' 
        ){
            return `date_trunc('${toFullUnit(unit)}', ${start})`
        }
        throw Error(`extend() is not implemented for ${_variables._target_database} yet`)  
    }

    function toEnd(one, two) {
        let unit
        let start
        if (two === undefined) {
            unit = one
            start= today()
        } else {
            start = one
            unit = two
        }
        if (_variables._target_database === 'clickhouse' ||
            _variables._target_database === 'postgresql' || 
            _variables._target_database === 'oracle' 
        ){
            return `date_trunc('${toFullUnit(unit)}', ${start}) + ${toSQLIntervalEOP(unit)}`
        }
        throw Error(`extend() is not implemented for ${_variables._target_database} yet`)  
    }

    function today(){
        if (_variables._target_database === 'postgresql') {
            return 'CURRENT_DATE'
        } else if (_variables._target_database === 'sqlserver'){
            return 'GETDATE()'
        } else if (_variables._target_database === 'qlickhouse'){
            return 'today()'
        }

        throw Error(`today() is not implemented for ${_variables._target_database} yet`)
        
    }

    function now(){
        if (_variables._target_database === 'postgresql' || 
            _variables._target_database === 'qlickhouse') 
        {
            return 'now()'
        }

        return 'CURRENT_TIMESTAMP' // https://stackoverflow.com/questions/385042/sql-server-equivalent-of-mysqls-now
        
    }
 
//shiftPeriod() = 2 или 3 аргумента shiftPeriod(-1, 'month') shiftPeriod(today(), -1, 'month')
    function dateShift(one, two, three) {
        //console.log(`dateShift(${one}, ${two}, ${three})`)
        let delta
        let unit
        let start
        if (three === undefined) {
            delta = one
            unit = two
            start= today()
        } else {
            start = one
            delta = two
            unit = three
        }
        
        if (_variables._target_database === 'postgresql' || 
                   _variables._target_database === 'oracle'     ||
                   _variables._target_database === 'clickhouse'
                   ) 
        {
            if (isArray(start)){
                return [
                    `${start[0]} + ${toSQLInterval(delta, unit)}`,
                    `${start[1]} + ${toSQLInterval(delta, unit)}`
                ]
            } else {
                return `${start} + ${toSQLInterval(delta, unit)}`
            }
        }
        
        throw Error(`dateAdd() is not implemented for ${_variables._target_database} yet`)  
    }

    // bound('2023-10-22', 'm') => [2023-10-01, 2023-10-30]
    function bound(one, two) {
        let unit
        let start
        if (two === undefined) {
            unit = one
            start= today()
        } else {
            start = one
            unit = two
        }
        
        if (_variables._target_database === 'clickhouse' ||
            _variables._target_database === 'postgresql' || 
            _variables._target_database === 'oracle') {
          return [
            toStart(start, unit),
            toEnd(start, unit), // EOP
          ]
        }
        
        throw Error(`dateAdd() is not implemented for ${_variables._target_database} yet`)  
    }

    // extend(1, 'm') => [now(), now+interval '1 month']
    // первый аргумент может быть массивом дат из 2-х элементов! 
    function extend(one, two, three) {
        let delta
        let unit
        let start
        if (three === undefined) {
            delta = one
            unit = two
            start= today()
        } else {
            start = one
            delta = two
            unit = three
        }
        
        if (_variables._target_database === 'clickhouse' ||
            _variables._target_database === 'postgresql' || 
            _variables._target_database === 'oracle') 
        {
            if (isArray(start)) {
                // ровно 2 элемента !!!
                if (start.length !== 2){
                    throw Error(`you can use only 2 elements Array for date literal`)
                }
                return [
                    start[0],
                    dateShift(start[1], delta, unit)
                ]

            } else {
            return [
                start,
                //`${start} + ${toSQLInterval(delta, unit)}`,
                dateShift(start, delta, unit)
              ]
            }
        }
        throw Error(`extend() is not implemented for ${_variables._target_database} yet`)  
    }


    return {
        'dateShift' : dateShift,
        'today': today,
        'now': now,
        'bound': bound,
        'extend': extend,
        'toStart': toStart,
        'toEnd': toEnd
    }
}