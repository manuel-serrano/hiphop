${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

HipHop Syntax
=============

HipHop is a DSL embedded in the HopScript language. HipHop module
_must_ contain the following header declaration:

```hopscript
"use hiphop"
```

The HipHop syntax extends the JavaScript syntax with one single
expression rule:

```ebnf
  hiphop <HHstatement>
```

Its complete formal syntax is given in Section [Formal Syntax](./00-syntax.html#formal-syntax).

### Example ###

${ <span class="label label-info">abro.js</span> }

```hiphop
${ doc.include( ROOT + "/../tests/abro.hh.js" ) }
```

HipHop Module
=============

```ebnf
<HHModule> --> module [ <Identifier> ] ( <FormalSignalList> )

```

### Example using simple signals ###

A module with one input signal `I`, and one input/output signal `O`.

${ <span class="label label-info">every1.js</span> }

```hiphop
${ doc.include( ROOT + "/../tests/every1.hh.js" ) }
```

### Example using combined signals ###

A module with an input/output signal `O` with default value `5`
and a combine function.

${ <span class="label label-info">value1.js</span> }

```hiphop
${ doc.include( ROOT + "/../tests/value1.hh.js" ) }
```

HipHop Expressions
==================

HipHop expressions are used to emit signal with values or to express
a condition that should be meet for an action to be executed. HipHop
expressions extend the JavaScript syntax with the following constructs.


```ebnf
<HHExpression> --> <Expression>
  | now( <Identifier> )
  | pre( <Identifier> )
  | val( <Identifier> )
  | preval( <Identifier> )
```

HipHop expressions can only be used in the syntactic context of a HipHop
instructions.

Example:
${ <span class="label label-info">await-valued.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../tests/await-valued.hh.js" ) }
```

Delays
======

Delays ... They are defined as:


```ebnf
<HHDelay> --> <HHExpression>
  | count( <HHExpression>, <HHExpression> )
  | immediate <HHExpression>
```

Example:

${ <span class="label label-info">await-count2.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../tests/await-count2.hh.js" ) }
```


Await and Emit
==============

```ebnf
<HHAwait> --> await <HHDelay>
  | await immediate <HHDelay>
<HHEmit> --> emit <Identifier>()
  | emit <Identifier>( <HHExpression> )
```

Loops
=====

HipHop provides several sort of loops.

```ebnf
<HHLoop> --> loop <HHBlock>
<HHEvery> --> every( <HHDelay> ) <HHBlock>
<HHDo> --> do <HHBlock> every( <HHDelay> )
<HHSustain> --> sustain <Identifier>()
  | sustain <Identifier>( <HHExpression> )

```

Formal Syntax
=============
${ <a id="formal-syntax"/> }

```ebnf
${ doc.include( ROOT + "/hiphop.bnf" ) }
```

