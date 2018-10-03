${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

Signals enable HipHop components to communicate with one
another. They also implement outside world communication. A signal is
identified by its name, it can be local, i.e., defined locally inside
a [module](./module.html) and invisible outside this module, or global,
that is defined as an input or as an output of the main module.

A signal can also carry a value. The value is specified by the
_emitter_ and transmitted to the _receiver_. A same signal can be
emitted several times during a reaction but it that signal is valued,
a combination used to accumulate all the values must be specified when
the signal is declared. The combination function is an arbitrary
JavaScript but it _must_ be associative and commutative.

Signal Declarations
===================

Signals are declared in the [module signature](./module.html) an with
the [signal](./syntax.html#HHSignal) construct that declare local
signals.

### signal [ident]( arg, ... ) { stmt, ... } ###
[:@glyphicon glyphicon-tag syntax]



Valued Signals
==============

Signals presence (has a signal been emitted or not during the reaction)
and signal values can be used in HipHop JavaScript expressions



```ebnf
<HHExpression> --> <Expression>
  | now( <Identifier> )
  | pre( <Identifier> )
  | nowval( <Identifier> )
  | preval( <Identifier> )
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
${ doc.include( ROOT + "/../../tests/await-count2.hh.js" ) }
```


Await and Emit
==============

```ebnf
<HHAwait> --> await <HHDelay>
  | await immediate <HHDelay>
<HHEmit> --> emit <Identifier>()
  | emit <Identifier>( <HHExpression> )
<HHSustain> --> sustain <Identifier>()
  | sustain <Identifier>( <HHExpression> )
```

### await [immediate] delay
[:@glyphicon glyphicon-tag syntax]

Await for the condition to be true. The form `await expr` is equivalent to
`{ yield; await immediate expr}`. This is `await` always yields before 
the condition can be satisfied. Examples:

${ <span class="label label-info">await-seq.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/await-seq.hh.js" ) }
```

Await for the event `I` to be present in three distinctive instants.

${ <span class="label label-info">await-count.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/await-count.hh.js" ) }
```

### emit ident( ... ) ###
[:@glyphicon glyphicon-tag syntax]

The form `emit` is emits a signal when executed.


### sustain ident( ... ) ###
[:@glyphicon glyphicon-tag syntax]

The `sustain` is equivlant to `emit` but it keeps emiting its signal
at each instant.

A permant signal:

${ <span class="label label-info">sustain1.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/sustain1.hh.js" ) }
```

