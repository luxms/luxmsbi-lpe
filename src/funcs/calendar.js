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
            return `INTERVAL '${+i*3} MONTH'`
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

    /* попытка определить, что параметр - это просто закавыченная строка в понятном формате,
       и если это так, то  нужно сделать адаптацию для SQL базы */
    function adapt_date(dt) {
    if (/^'\d{4}-\d{2}-\d{2}'$/.test(dt)) {
      if (_variables._target_database === 'clickhouse') {
        return "toDate(".concat(dt, ")");
      } else if (_variables._target_database === 'mysql') {
        return "STR_TO_DATE(".concat(dt, ", '%Y-%m-%d')");
      } else if (_variables._target_database === 'sqlserver') {
        return "CAST(".concat(dt, " as date)");
      } else { 
        return "to_date(".concat(dt, ", 'YYYY-MM-DD')");
      }
    }
        return dt
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
            return `date_trunc('${toFullUnit(unit)}', ${adapt_date(start)})`
        } else if (_variables._target_database === 'sqlserver') {
            return `DATETRUNC('${toFullUnit(unit)}', ${adapt_date(start)})`
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
            return `date_trunc('${toFullUnit(unit)}', ${adapt_date(start)}) + ${toSQLIntervalEOP(unit)}`
        } else if (_variables._target_database === 'sqlserver') {
            return `DATETRUNC('${toFullUnit(unit)}', ${adapt_date(start)}) + ${toSQLIntervalEOP(unit)}`
        }
        throw Error(`extend() is not implemented for ${_variables._target_database} yet`)  
    }

    function today(){
        if (_variables._target_database === 'sqlserver'){
            return 'GETDATE()'
        } else if (_variables._target_database === 'clickhouse'){
            return 'today()'
        } else {
            return 'CURRENT_DATE'
        }

    }

    function now(){
        if (_variables._target_database === 'postgresql' || 
            _variables._target_database === 'clickhouse') 
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
                    `${adapt_date(start[0])} + ${toSQLInterval(delta, unit)}`,
                    `${adapt_date(start[1])} + ${toSQLInterval(delta, unit)}`
                ]
            } else {
                return `${adapt_date(start)} + ${toSQLInterval(delta, unit)}`
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
                    adapt_date(start[0]),
                    dateShift(start[1], delta, unit)
                ]

            } else {
            return [
                adapt_date(start),
                //`${start} + ${toSQLInterval(delta, unit)}`,
                dateShift(start, delta, unit)
              ]
            }
        }
        throw Error(`extend() is not implemented for ${_variables._target_database} yet`)  
    }

    // возвращает год как INTEGER !!!
    function year(dt){
        if (_variables._target_database === 'sqlserver' ||
            _variables._target_database === 'mysql'
        ){
            return `year(${adapt_date(dt)})`
        } else if (_variables._target_database === 'clickhouse'){
            return `year(${adapt_date(dt)})`
        } else {
            return `CAST(EXTRACT(YEAR FROM ${adapt_date(dt)}) AS INT)`
        }
    }

    // возвращает полугодие года как INTEGER !!!
    function hoty(dt){
        if (_variables._target_database === 'sqlserver'){
            return `(DATEPART(QUARTER, ${adapt_date(dt)})/3+1)`
        } else if (_variables._target_database === 'clickhouse'){
            return `(intDiv(quarter(${adapt_date(dt)}),3)+1)`
        } else if (_variables._target_database === 'mysql'){
            return `(quarter(${adapt_date(dt)}) DIV 3 + 1)`
        } else {
            return `(CAST(EXTRACT(QUARTER FROM ${adapt_date(dt)}) AS INT)/3+1)`
        }
    }

    // возвращает квартал года как INTEGER !!!
    function qoty(dt){
        if (_variables._target_database === 'sqlserver'){
            return `DATEPART(QUARTER, ${adapt_date(dt)})`
        } else if (_variables._target_database === 'clickhouse' ||
                   _variables._target_database === 'mysql'
        ){
            return `quarter(${adapt_date(dt)})`
        } else {
            return `CAST(EXTRACT(QUARTER FROM ${adapt_date(dt)}) AS INT)`
        }
    }


    // возвращает месяц года как INTEGER !!!
    function moty(dt){
        if (_variables._target_database === 'sqlserver' ||
            _variables._target_database === 'mysql'
        ){
            return `month(${adapt_date(dt)})`
        } else if (_variables._target_database === 'clickhouse'){
            return `month(${adapt_date(dt)})`
        } else {
            return `CAST(EXTRACT(MONTH FROM ${adapt_date(dt)}) AS INT)`
        }
    }

    // возвращает неделю года как INTEGER !!!
    function woty(dt){
        if (_variables._target_database === 'sqlserver'){
            return `DATEPART(WEEK, ${adapt_date(dt)})` // INT
        } else if (_variables._target_database === 'mysql'){
            return `week(${adapt_date(dt)})`
        } else if (_variables._target_database === 'clickhouse'){
            return `week(${adapt_date(dt)})`
        } else {
            return `CAST(EXTRACT(WEEK FROM ${adapt_date(dt)}) AS INT)`
        }
    }

    // возвращает день года как INTEGER
    function doty(dt){
        if (_variables._target_database === 'sqlserver'){
            return `DATENAME(dayofyear, ${adapt_date(dt)})` // INT
        } else if (_variables._target_database === 'mysql'){
            return `CAST(DAYOFYEAR(${adapt_date(dt)}) AS UNSIGNED)`
        } else if (_variables._target_database === 'clickhouse'){
            return `toDayOfYear(${adapt_date(dt)})`
        } else {
            return `CAST(EXTRACT(DOY FROM ${adapt_date(dt)}) AS INT)`
        }
    }

    // возвращает год как строку!
    function isoy(dt) {
        if (_variables._target_database === 'sqlserver'){
            return `FORMAT(${adapt_date(dt)}, 'yyyy')`
        } else if (_variables._target_database === 'mysql') {
            return `DATE_FORMAT(${adapt_date(dt)}, '%Y')`
        } else if (_variables._target_database === 'clickhouse'){
            return `formatDateTime(${adapt_date(dt)}, '%Y')`
        } else {
            return `TO_CHAR(${adapt_date(dt)}, 'YYYY')`
        }
    }

    // 2024-12 
    function isom(dt) {
        if (_variables._target_database === 'sqlserver'){
            return `FORMAT(${adapt_date(dt)}, 'yyyy-MM')`
        } else if (_variables._target_database === 'mysql') {
            return `DATE_FORMAT(${adapt_date(dt)}, '%Y-%m')`
        } else if (_variables._target_database === 'clickhouse'){
            return `formatDateTime(${adapt_date(dt)}, '%Y-%m')`
        } else {
            return `TO_CHAR(${adapt_date(dt)}, 'YYYY-MM')`
        }
    }

    // 2024-Q1 
    function isoq(dt) {
        if (_variables._target_database === 'sqlserver'){
            return `CONCAT(FORMAT(${adapt_date(dt)}, 'yyyy'), '-Q', DATEPART(QUARTER, ${adapt_date(dt)}))`
        } else if (_variables._target_database === 'mysql') {
            return `CONCAT(DATE_FORMAT(${adapt_date(dt)}, '%Y'), '-Q', quarter(${adapt_date(dt)}))`
        } else if (_variables._target_database === 'clickhouse'){
            return `replaceRegexpOne(formatDateTime(${adapt_date(dt)}, '%Y-%Q'), '-\\d{1}', '-Q' || formatDateTime(${adapt_date(dt)}, '%Q'))`
        } else {
            return `TO_CHAR(${adapt_date(dt)}, 'YYYY-"Q"Q')`
        }
    }

    // 2024-W01 
    function isow(dt) {
        if (_variables._target_database === 'sqlserver'){
            return `CONCAT( YEAR(DATEADD(day, 3 - (DATEPART(weekday, ${adapt_date(dt)}) + 5) % 7, ${adapt_date(dt)})), '-W', FORMAT(datepart(iso_week, ${adapt_date(dt)}),'D2'))`
        } else if (_variables._target_database === 'mysql') {
            return `INSERT(YEARWEEK(${adapt_date(dt)}, 3), 5, 0,'-W')`
        } else if (_variables._target_database === 'clickhouse'){
            return `concat( toString(toISOYear(${adapt_date(dt)})), '-W', leftPad(toString(toISOWeek(${adapt_date(dt)})), 2, '0') )`
        } else {
            return `TO_CHAR(${adapt_date(dt)}, 'IYYY"-Q"IW')`
        }
    }

    // 2024-356 
    function isod(dt) {
        if (_variables._target_database === 'sqlserver'){
            return `CONCAT(FORMAT(${adapt_date(dt)}, 'yyyy'), '-', FORMAT( DATEPART(dayofyear , ${adapt_date(dt)}), 'D3'))`
        } else if (_variables._target_database === 'mysql') {
            return `DATE_FORMAT(${adapt_date(dt)}, '%Y-%j')`
        } else if (_variables._target_database === 'clickhouse'){
            return ` formatDateTime(${adapt_date(dt)}, '%Y-%j')`
        } else {
            return `TO_CHAR(${adapt_date(dt)}, 'YYYY-DDD')`
        }
    }


    return {
        'dateShift' : dateShift,
        'today': today,
        'now': now,
        'bound': bound,
        'extend': extend,
        'toStart': toStart,
        'toEnd': toEnd,

        'isoy': isoy,
        'isoq': isoq,
        'isom': isom,
        'isow': isow,
        'isod': isod,

        'year': year,
        'hoty': hoty,
        'qoty': qoty,
        'moty': moty,
        'woty': woty,
        'doty': doty
    }
}