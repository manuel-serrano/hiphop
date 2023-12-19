<!-- ${ var doc = require("hopdoc") }
${ var path = require("path") }
${ var ROOT = path.dirname(module.filename) } -->

Sequence, Yield, and Parallelism
================================

Sequences are implicit in HipHop. That is, two statements separated by
a `;` are executed sequentially. 


### yield ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHYield)

A thread of execution can suspend itself for the current instance using
the `yield` construct. The execution will resume after the `yield` when
the `react` method of the machine will be called again.

&#x2605; Example: [weak.hh.js](../../test/weak.hh.js)
&#x2605; Example: [trap-par-3.hh.js](../../test/trap-par-3.hh.js)


### fork { ... } par { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHFork)

Run all the bodies in parallel. Complete when all bodies have completed.

&#x2605; Example: [parallel-unary.hh.js](../../test/paralle-unary.hh.js)

This example uses two nested `fork` constructs. The second is synchronized
with the first as it waits for an event the first branch is to emit.


Exit
====

### exit ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHExit)


Lexical Escapes
===============

### break lbl ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHBreak)


Loops
=====

Loops are so central HipHop program control flow that HipHop proposes
several loop constructs.

### loop { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHLoop)

Implements an infinite loop

Example:

${ <span class="label label-info">sync1.hh.js</span> }

```hiphop
${ doc.include(ROOT + "/../../tests/sync1.hh.js") }
```

### every (test) { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHEvery)

A loop executed each time the `test` is true. Abort the execution of 
the body when `test` is true.

${ <span class="label label-info">every1.hh.js</span> }

```hiphop
${ doc.include(ROOT + "/../../tests/every1.hh.js") }
```

### do { ... } every (test) ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHDo)

Execute the `do`'s body and loop when `test` is true.

${ <span class="label label-info">loopeach.hh.js</span> }

```hiphop
${ doc.include(ROOT + "/../../tests/loopeach.hh.js") }
```

### abort (test) { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHAbort)

Execute the `abort`'s body and abort the execution when `test` is true.

