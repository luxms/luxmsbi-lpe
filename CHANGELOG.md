# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
