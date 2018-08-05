${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

HipHop Syntax
=============

HipHop is a DSL embedded in the HopScript language. It extends its syntax
with one single expression rule:

```ebnf
  hiphop <HHstatement>
```

Its complete formal syntax is given in Section [Formal Syntax](./00-syntax.html#formal-syntax).

### Example ###

${ <span class="label label-info">abro.js</span> }

```hopscript
${ doc.include( ROOT + "/../tests/abro.hh.js" ) }
```

HipHop Module
=============

```ebnf
<HHModule> --> module [ <Identifier> ] ( <FormalSignalList> )

```

### Example ###

A module with one input signal `I`, and one input/output signal `O`.

${ <span class="label label-info">every1.js</span> }

```hopscript
${ doc.include( ROOT + "/../tests/every1.hh.js" ) }
```

### Example ###

A module with an input/output signal `O` with default value `5`
and a combine function.

${ <span class="label label-info">value1.js</span> }

```hopscript
${ doc.include( ROOT + "/../tests/value1.hh.js" ) }
```

Formal Syntax
=============
${ <a id="formal-syntax"/> }

```ebnf
${ doc.include( ROOT + "/hiphop.bnf" ) }
```

