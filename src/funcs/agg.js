

export function generateAggContext(v){
  let _variables = v

  function median(col) {
    _variables["_result"]["agg"] = true
    if (_variables._target_database === 'clickhouse') {
      return `quantile(0.5)(${col})`
    } else if (_variables._target_database === 'postgresql' || 
               _variables._target_database === 'oracle') {
      return `percentile_cont(0.5) WITHIN GROUP (ORDER BY ${col} DESC)`
    } else if (_variables._target_database === 'teradata' || _variables._target_database === 'sap'){
      return `median(${col})`
    } else {
      throw Error(`median() is not implemented for ${_variables._target_database} yet`)
    }
  }

  function mode(col) {
    _variables["_result"]["agg"] = true
    if (_variables._target_database === 'clickhouse') {
      return `arrayElement(topK(1)(${col}),1)`
    } else if (_variables._target_database === 'postgresql') {
      return `mode() WITHIN GROUP (ORDER BY ${col})`
    } else if (_variables._target_database === 'oracle') {
      return `STATS_MODE(${col})`
    } else {
      throw Error(`mode() is not implemented for ${_variables._target_database} yet`)
    }
  }

  function varPop(col) {
    _variables["_result"]["agg"] = true
    if (_variables._target_database === 'clickhouse') {
      return `varPop(${col})`
    } else if (_variables._target_database === 'postgresql' || 
               _variables._target_database === 'oracle' ||
               _variables._target_database === 'teradata' ||
               _variables._target_database === 'vertica' ||
               _variables._target_database === 'sap'
               ) {
      return `var_pop(${col})`
    } else if (_variables._target_database === 'sqlserver') {
      return `VarP(${col})`
    } else {
      throw Error(`var_pop() is not implemented for ${_variables._target_database} yet`)
    }
  }

  function varSamp(col) {
    _variables["_result"]["agg"] = true
    if (_variables._target_database === 'clickhouse') {
      return `varSamp(${col})`
    } else if (_variables._target_database === 'postgresql' || 
               _variables._target_database === 'oracle' ||
               _variables._target_database === 'teradata' ||
               _variables._target_database === 'vertica' ||
               _variables._target_database === 'sap'
              ) {
      return `var_samp(${col})`
    } else if (_variables._target_database === 'sqlserver') {
      return `Var(${col})`
    } else {
      throw Error(`var_samp() is not implemented for ${_variables._target_database} yet`)
    }
  }


  function stddevSamp(col) {
    _variables["_result"]["agg"] = true
    if (_variables._target_database === 'clickhouse') {
      return `stddevSamp(${col})`
    } else if (_variables._target_database === 'postgresql' || 
               _variables._target_database === 'oracle' ||
               _variables._target_database === 'teradata' ||
               _variables._target_database === 'vertica' ||
               _variables._target_database === 'sap'
               ) {
      return `stddev_samp(${col})`
    } else if (_variables._target_database === 'sqlserver') {
      return `Stdev(${col})`
    } else {
      throw Error(`var_samp() is not implemented for ${_variables._target_database} yet`)
    }
  }

 
  function stddevPop(col) {
    _variables["_result"]["agg"] = true
    if (_variables._target_database === 'clickhouse') {
      return `stddevPop(${col})`
    } else if (_variables._target_database === 'postgresql' || 
               _variables._target_database === 'oracle' ||
               _variables._target_database === 'teradata' ||
               _variables._target_database === 'vertica' ||
               _variables._target_database === 'sap'
              ) {
      return `stddev_pop(${col})`
    } else if (_variables._target_database === 'sqlserver') {
      return `StdevP(${col})`
    } else {
      throw Error(`var_samp() is not implemented for ${_variables._target_database} yet`)
    }
  }


  return {
    'median': median,
    'mode' : mode,
    'varPop': varPop,
    'varSamp': varSamp,
    'stddevSamp': stddevSamp,
    'stddevPop': stddevPop
  }
              
}
