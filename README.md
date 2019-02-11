[![Build Status](https://travis-ci.org/luxms/luxmsbi-lpe.svg?branch=master)](https://travis-ci.org/luxms/luxmsbi-lpe)

# LPE parser

## Two grammars

### Standard LPE grammar

basically follows LISP notation but written with C-like function call semantics. Example: `f1(1,b,c).f2(d,e,f).f3(w)`
Dot (`.`) operations will compose to `seq` call: `["seq",["f1","1","b","c"],["f2","d","e","f"],["f3","w"]]`

Arrays notation `[]` will result in `vector` calls: `[1,2,3]` => `["vector","1","2","3"]`

### Logical LPE grammar

Some functions will have special syntax for their arguments. Currently only `logical` syntax is supported.
It is used only for `where` function, which has single logical expression argument with 3 operations: `and`, `or`, `not`.
Logical operations may use any LPE expression as argumants. Brackets are preserved with call to obvious `()` function.

`where((a and b or c) or (avg(d) < avg(e)) or (e = 20 and parse_kv(locations.src_id)))`

```JSON
["where",
  ["or",
    ["()",
      ["and",
        "a",
        ["or","b","c"]
      ]
    ],
    ["or",
      ["()",
        ["<",
          ["avg","d"],
          ["avg","e"]
        ]
      ],
      ["()",
        ["and",
          ["=","e","20"],
          ["parse_kv",["seq","locations","src_id"]]
        ]
      ]
    ]
  ]
]
```

Note, that dot notation in arguments `locations.src_id` is currently interpreted as `seq` call.

## Run from cli

`echo "FIRST([in([6+abc().cba()*3+2,6+8],out()),[45,44],444]).SECOND(.fff(2,3,4,,3+5-987).last())" | npm run cli`

# Tests

Run tests:

`npm install`
`npm run test`
