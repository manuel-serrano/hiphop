${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

HipHop Syntax
=============

HipHop is a DSL embedded in the HopScript language. It extends its syntax
with one single expression rule:

  hiphop hhstatement

The complete HipHop formal syntax is:

```ebnf
${ doc.include( ROOT + "/hiphop.bnf" ) }
```

### Example ###

${ <span class="label label-info">syntax.js</span> }

```hopscript
${ doc.include( ROOT + "../test/abro.hh.js" ) }
```
 



