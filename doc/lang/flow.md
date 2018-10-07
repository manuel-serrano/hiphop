${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

Sequence, Yield, and Parallelism
================================

Sequences are implicit in HipHop. That is, two statements separated by
a `;` are executed sequentially. 


### yield ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHYield)

A thread of execution can suspend itself for the current instance using
the `yield` construct. The execution will resume after the `yield` when
the `react` method of the machine will be called again.


### fork { ... } par { ... } ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHFork)

Run all the bodies in parallel. Complete when all bodies have completed.

Example: 

This example uses two nest `fork` constructs. The second is synchronized
with the first as it waits for an event the first branch is to emit.

${ <span class="label label-info">parallel-unary.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/parallel-unary.hh.js" ) }
```


Exit
====

### exit ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHExit)


Lexical Escapes
===============

### break lbl ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHBreak)


Loops
=====

Loops are so central HipHop program control flow that HipHop proposes
several loop constructs.

### loop { ... } ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHLoop)

Implements an infinite loop

Example:

${ <span class="label label-info">sync1.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/sync1.hh.js" ) }
```

### every( test ) { ... } ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHEvery)

A loop executed each time the `test` is true:

${ <span class="label label-info">every1.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/every1.hh.js" ) }
```

### do { ... } every( test ) ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHDo)

Execute the `do`'s body and loop when `test` is true.

${ <span class="label label-info">loopeach.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/loopeach.hh.js" ) }
```

