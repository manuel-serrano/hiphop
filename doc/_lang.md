<!-- ${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) } -->

The HipHop Programming Language
===============================

> [!WARNING]
> HipHop requires the program to use ECMAScript modules.


The HipHop syntax extends the JavaScript syntax with one single
expression rule:

```ebnf
  hiphop <HHstatement>
```

HipHop syntax is described in this [document][syntax/hiphop.bnf].

Once defined, a HipHop program must be _loaded_ into a HipHop
[reactive machine](./api.md) that can execute this program by
running _reactions_.

### Example ###

[Example 1](../../test/abro.hh.js)


Table of contents
-----------------

  1. [Lang](./lang/lang.md)
  2. [Signals](./lang/signal.md)
  5. [Module](./lang/module.md)
  3. [Flow](./lang/flow.md)
  4. [Async](./lang/async.md)
