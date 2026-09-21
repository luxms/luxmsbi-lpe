# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.7.2](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.7.1...v1.7.2) (2026-09-21)


### Bug Fixes

* устранить задержку при загрузке LPE ([1d74461](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/1d7446181b6c1a20e729463f149729cf1bd3700c))

### [1.7.1](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.7.0...v1.7.1) (2026-09-18)


### Bug Fixes

* восстановить define и исправить deparse ([0187259](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/0187259ff534b91d27a875f6ff0586bfcbf20484))

## [1.7.0](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.6.7...v1.7.0) (2026-09-17)


### ⚠ BREAKING CHANGES

* remove functions ~, macroexpend; remove macros support; remove JS functions init_lisp, evaluate, makeMacro, isMacro, env_bind; migrate to SF unbox support; refactor lisp structure; add lisp functions; refactor variables

### Bug Fixes

* := operator not returns value of new variables ([ff12033](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/ff12033a77527bac827cf4463d1f3f2dbc47189c))
* crs string prints 2 chars -- under \n ([785592a](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/785592aca4544d7987284c747fc9a5a837c0354b))
* doc: add lamda function correct parsing ([b58cdfe](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/b58cdfe9438f80c5825bb91384c3ef564d541fa4))
* Hashmap now is not global object ([c581814](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/c58181410c09a886d7d73b54b18cfa97ea8d09e3))
* let* bindings with names as expression ([964e685](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/964e685b95f33e5159638877b723b72af9e2e6d7))
* localize generation error on ([b7ac9bd](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/b7ac9bd0a250a3a887a388962dd4cf3168212187))
* multiple assign by := ([927d803](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/927d803a8ebd8267698bd7336887ee11534e0501))
* rename utils -> scripts; export default at context files ([20bb5f2](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/20bb5f267b6c5e1c24e9eae18c434973ad6012bd))


### changes

* remove functions ~, macroexpend; remove macros support; remove JS functions init_lisp, evaluate, makeMacro, isMacro, env_bind; migrate to SF unbox support; refactor lisp structure; add lisp functions; refactor variables ([4b1e9d2](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/4b1e9d24a4e83e3eb7875fc4c8d62232e232597a))

### [1.6.7](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.6.6...v1.6.7) (2026-05-05)

### [1.6.6](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.6.5...v1.6.6) (2026-05-04)

### [1.6.5](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.6.4...v1.6.5) (2026-05-04)

### [1.6.4](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.6.3...v1.6.4) (2026-04-16)


### Bug Fixes

* en localization text ([a734dbd](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/a734dbd862853febec4994a35eb8c2e06d167e3f))
* literal functions as variables ([11c4196](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/11c41961a19d83d78967670ad14ff43c582ec646))

### [1.6.3](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.6.2...v1.6.3) (2026-03-30)


### Bug Fixes

* add eval_ast logig with custom context ([d92fbac](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/d92fbacad2c87106e3f094f04cb5b75f2e504194))

### [1.6.2](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.10...v1.6.2) (2026-03-20)


### Bug Fixes

* 'try' function variable not found exception ([89ee98e](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/89ee98e5e6fd9b2aafe4becc773a6a0e619e1e94))
* doc comments ([c4e33b9](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/c4e33b95979d67fb6faf93d1163f7fb5e09e223f))
* now '.-' function not evaluate property name as varable ([fe7d13b](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/fe7d13b5c17c7e54f5bfbe653a512bf17b0d3452))

### [1.6.1](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.6.0...v1.6.1) (2025-11-24)


### Bug Fixes

* support of -> as . ([add0efa](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/add0efa30fb10e63ab211d2e57632065b764aed5))

## [1.6.0](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.5...v1.6.0) (2025-11-13)

### [1.5.10](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.9...v1.5.10) (2026-03-16)


### Bug Fixes

* now '.-' function not evaluate property name as varable ([93eee63](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/93eee63b6b2324ee28fd3db0c98808c09d8d7bdd))

### [1.5.9](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.8...v1.5.9) (2026-02-27)

### [1.5.8](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.7...v1.5.8) (2026-02-10)

## [1.6.0](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.6...v1.6.0) (2026-01-28)

### [1.6.1](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.6.0...v1.6.1) (2025-11-24)


### Bug Fixes

* support of -> as . ([add0efa](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/add0efa30fb10e63ab211d2e57632065b764aed5))

## [1.6.0](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.5...v1.6.0) (2025-11-13)

### [1.5.5](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.4...v1.5.5) (2025-10-13)

### [1.5.4](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.3...v1.5.4) (2025-10-08)

### [1.5.3](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.2...v1.5.3) (2025-08-28)


### Bug Fixes

* ':' priority ([2db6272](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/2db627261cec11ce8a932779ef418d58932fc69a))

### [1.5.2](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.1...v1.5.2) (2025-08-20)


### Bug Fixes

* set colon precedence to 59 ([9650dee](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/9650deeb1a6623266f28435cd9947fb7246999a0))

### [1.5.1](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.5.0...v1.5.1) (2025-06-27)

## [1.5.0](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.4.7...v1.5.0) (2025-06-18)


### Features

* added default values to function args ([9ce3ae0](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/9ce3ae009e5688513e81259c6b47a184e5a4df78))
* added do while loop ([f520e46](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/f520e46712947728548a73b5c0cef5bd351b1352))
* added named args ([4428820](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/4428820eeebdbd3e9ee08b7225af3987e8132545))


### Bug Fixes

* added handler for non-string arguments in tokenize ([8d5ca54](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/8d5ca54d5b7a3278e90b227b697d6aea66f3661a))
* const -> let ([c517361](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/c5173610666fefc192c934e910db6634ac2229d3))
* plus operator concat function bodies ([34c124a](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/34c124a589efed31451c46ef7f9b673abed0d724))
* try catch special form ([a311736](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/a3117366265f0978b4e16774174d176abdcbb6ac))
* wrong reduce in plus when args is not strings ([c096215](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/c0962155b96780baea0455a5b55ffe7ac1adf8de))

### [1.4.7](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.4.5...v1.4.7) (2025-04-16)


### Bug Fixes

* add json_parse function; change eval_ast ([8facb32](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/8facb3293ba161aa0b60354198836211e262b1b8))
* changed right file ([a4116ce](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/a4116ce192e39905870ddeed23ab366035af99ae))
* skip any number of semicolons during parsing ([63bd80f](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/63bd80fd834dfc02b06d74e1af6dd48be132e9e1))

### [1.4.6](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/compare/v1.4.5...v1.4.6) (2025-02-24)


### Bug Fixes

* changed right file ([a4116ce](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/a4116ce192e39905870ddeed23ab366035af99ae))
* skip any number of semicolons during parsing ([63bd80f](https://gito.luxms.com/luxmsbi/luxmsbi-lpe/commit/63bd80fd834dfc02b06d74e1af6dd48be132e9e1))

### [1.4.5](https://github.com/luxms/luxmsbi-lpe/compare/v1.4.3...v1.4.5) (2025-02-11)
- Added curly brackets for arrays

### [1.4.3] - 2025-02-05
- Fixed function pluck for wrong types of arguments

### [1.4.2] - 2025-01-16
- Added datetime functions to STDLIB 

### [1.4.1] - 2025-01-15
- Fixed missed exceptions for special forms

### [1.4.0] - 2024-10-23
- Added optional squareBrackets mode: parse square brackets as string `[Column name]` -> `["[]", "Column name"]` 
