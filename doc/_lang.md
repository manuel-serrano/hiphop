${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

HipHop is a DSL embedded in the HopScript language. HipHop modules
_must_ contain the following header declaration:

```hopscript
"use hiphop"
```

The HipHop syntax extends the JavaScript syntax with one single
expression rule:

```ebnf
  hiphop <HHstatement>
```

Its complete formal syntax is given in Section [Formal Syntax](./00-syntax.html#formal-syntax). Once defined, a HipHop program must be _loaded_ into
a HipHop [reactive machine](./00-machine.html) that can execute this
program by running _reactions_.

### Example ###

${ <span class="label label-info">abro.js</span> }

```hiphop
${ doc.include( ROOT + "/../tests/abro.hh.js" ) }
```

