var assert = require('assert');

//var tokenize_sql_template = require('../src/utils/lpe_sql_tokenizer.js');

//var t = require('./utils/lpe_sql_tokenizer.js');
var t = require('../dist/lpe');



describe('SQL Templates tokenizer tests', function () {
  it('should tokenize sql + lpe', function () {
    assert.deepEqual(t.tokenize_sql_template('sql ${lpe}'), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 9,
        type: 'lpe',
        value: 'lpe'
      }
    ]
    )
  });

  it('should tokenize sql + lpe', function () {
    assert.deepEqual(t.tokenize_sql_template('sql ${lpe}SQL'), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 9,
        type: 'lpe',
        value: 'lpe'
      },
      {
        from: 10,
        to: 12,
        type: 'literal',
        value: 'SQL'
      }
    ]
    )
  });

  it('should tokenize lpe + sql', function () {
    assert.deepEqual(t.tokenize_sql_template('${lpe} sql'), 
    [
      {
        from: 0,
        to: 5,
        type: 'lpe',
        value: 'lpe'
      },
      {
        from: 6,
        to: 9,
        type: 'literal',
        value: ' sql'
      }
    ]
    )
  });


  it('should tokenize lpe + sql + lpe', function () {
    assert.deepEqual(t.tokenize_sql_template('${lpe} sql${LPE}'), 
    [
      {
        from: 0,
        to: 5,
        type: 'lpe',
        value: 'lpe'
      },
      {
        from: 6,
        to: 9,
        type: 'literal',
        value: ' sql'
      },
      {
        from: 10,
        to: 15,
        type: 'lpe',
        value: 'LPE'
      }
    ]
    )
  });

});





describe('SQL Templates Complex tokenizer tests', function () {
  it('should tokenize sql + double quoted lpe', function () {
    assert.deepEqual(t.tokenize_sql_template('sql ${"l{p}e"}'), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 13,
        type: 'lpe',
        value: '"l{p}e"'
      }
    ]
    )
  });


  it('should tokenize sql + single quoted lpe', function () {
    assert.deepEqual(t.tokenize_sql_template("sql ${'l{p}e'}"), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 13,
        type: 'lpe',
        value: "'l{p}e'"
      }
    ]
    )
  });

  it('should tokenize sql + nested {}', function () {
    assert.deepEqual(t.tokenize_sql_template("sql ${l{p}e}"), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 11,
        type: 'lpe',
        value: "l{p}e"
      }
    ]
    )
  });

  it('should tokenize sql + quoted nested {}', function () {
    assert.deepEqual(t.tokenize_sql_template("sql ${l'{p}'e}"), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 13,
        type: 'lpe',
        value: "l'{p}'e"
      }
    ]
    )
  });


  it('should tokenize sql + quoted with quote nested {}', function () {
    assert.deepEqual(t.tokenize_sql_template("sql ${l'{p\"}'e}"), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 14,
        type: 'lpe',
        value: "l'{p\"}'e"
      }
    ]
    )
  });

  it('should tokenize sql + double lpe', function () {
    assert.deepEqual(t.tokenize_sql_template("sql ${l}pe} ${Yo!}"), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 7,
        type: 'lpe',
        value: 'l'
      },
      {
        from: 8,
        to: 11,
        type: 'literal',
        value: 'pe} '
      },
      {
        from: 12,
        to: 17,
        type: 'lpe',
        value: 'Yo!'
      }
    ]
    )
  });


  it('should tokenize sql + double lpe', function () {
    assert.deepEqual(t.tokenize_sql_template("sql ${l}pe} :-} {${Yo{'':''}[{},{}'.'{}[]]!}}"), 
    [
      {
        from: 0,
        to: 3,
        type: 'literal',
        value: 'sql '
      },
      {
        from: 4,
        to: 7,
        type: 'lpe',
        value: 'l'
      },
      {
        from: 8,
        to: 11,
        type: 'literal',
        value: 'pe} '
      },
      {
        from: 12,
        to: 17,
        type: 'lpe',
        value: 'Yo!'
      }
    ]
    )
  });

});


