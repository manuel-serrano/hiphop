<!-- ${ var doc = require("hopdoc") }
${ var path = require("path") }
${ var ROOT = path.dirname(module.filename) } -->

Control Flow Operators
======================

Sequence, Yield, and Parallelism
--------------------------------

### sequence ###

Sequences are implicit in HipHop. That is, two statements separated by
a `;` are executed sequentially. 


### yield ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHYield)

A thread of execution can suspend itself for the current instance using
the `yield` construct. The execution will resume after the `yield` when
the `react` method of the machine will be called again.

&#x2605; Example: [weak.hh.js](../../test/weak.hh.js)

&#x2605; Example: [trap-par-3.hh.js](../../test/trap-par-3.hh.js)


### fork { ... } par { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHFork)

Run all the bodies in parallel. Complete when all bodies have completed.

&#x2605; Example: [parallel-unary.hh.js](../../test/parallel-unary.hh.js)

This example uses two nested `fork` constructs. The second is synchronized
with the first as it waits for an event the first branch is to emit.


Loops
-----

Loops are so central HipHop program control flow that HipHop proposes
several loop constructs.

### loop { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHLoop)

Implements an infinite loop

&#x2605; Example: [sync1.hh.js](../../test/sync1.hh.js)


### every (test) { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHEvery)

A loop executed each time the `test` is true. Abort the execution of 
the body when `test` is true.

${ <span class="label label-info">every1.hh.js</span> }

```hiphop
${ doc.include(ROOT + "/../../tests/every1.hh.js") }
```

### do { ... } every (test) ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHDo)

Execute the `do`'s body and loop when `test` is true.

${ <span class="label label-info">loopeach.hh.js</span> }

```hiphop
${ doc.include(ROOT + "/../../tests/loopeach.hh.js") }
```

### abort (test) { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHAbort)

Execute the `abort`'s body and abort the execution when `test` is true.


Lexical Escapes
---------------

HipHop supports an escape mechanism by the means for the `exit`/`break`
constructs. They enable a program to abort an ongoing computation.

### lbl ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHExit)

An _exit_ is syntactically similar to a JavaScript label. it must
be followed by a HipHop statement. This statement can be interrupted 
by _breaking_ to that exit form.

### break lbl ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHBreak)

Abort the execution of the current statement and continue the execution
after the statement that follows that break label. The `break` form 
can be used to abord an execution thread when used to escape a `fork`/`par`
form.

&#x2605; Example: [timeout.hh.js](../../test/timeout.hh.js)

This example shows how to exit a `loop`.

&#x2605; Example: [trap-par.hh.js](../../test/trap-par.hh.js)

This example shows how to exit a `fork`/`par`.

&#x2605; Example: [trap-await-parallel.hh.js](../../test/trap-await-parallel.hh.js)

This example shows that several threads can decide to exit from a `fork`/`par`.

&#x2605; Example: [p18.hh.js](../../test/p18.hh.js)


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](./README.md) | [[language]](../_lang.md) | [[license]](../license.md)

