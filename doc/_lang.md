<!-- ${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) } -->

The HipHop Programming Language
===============================

> [!WARNING]
> HipHop requires the program to use ECMAScript modules.


The HipHop syntax extends the JavaScript syntax with one single
statement:

```ebnf
  hiphop <HHstatement>
```

The `hiphop` tag is to be followd by a HipHop statement, whose
syntax is described in this [bnf grammar](syntax/hiphop.bnf).

This chapter documents the HipHop programming language.  The
connection with JavaScript is described in chapter [api](./api.md) and
the standard HipHop modules are described in chapter [standard
modules](./stdmod.md).


### Example ###

&#x2605; [The abro example](../test/abro.hh.js)


Table of contents
-----------------

  1. [Modules](./lang/module.md), _how to define HipHop modules._
  2. [Signals](./lang/signal.md), _how to deal with signals and variables._
  3. [Flow](./lang/flow.md), _the various HipHop statements._
  4. [Async](./lang/async.md), _the `async` form to orchestrate JavaScript asynchronous operations._
  5. [BNF](./syntax/hiphop.bnf), _the full HipHop programming language syntax._


- - - - - - - - - - - - - - - - - - - - - - - - - - - 
[[main page]](./README.md) | [[license]](./license.md)
