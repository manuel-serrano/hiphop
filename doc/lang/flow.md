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


### pragma ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHYield)

The `pragma` form executes a JavaScript statement during the reaction.

&#x2605; Example: [seq.hh.js](../../test/seq.hh.js)

The JavaScript body may have signal dependencies.

&#x2605; Example: [atom-dep-par.hh.js](../../test/atom-dep-par.hh.js)

> [!WARNING]
> Under no circumstances JavaScript side effects must be observable
> from within a HipHop reaction. It is the responsability of the
> JavaScript program not to execute visible side effects. If such
> a side effect happen and is observed from within a HipHop reaction,
> its behavior becomes unpredictable.


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

### halt ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

Terminate the current thread.

&#x2605; Example: [run-add-par.hh.js](../../test/run-add-par.hh.js)


Loop
----

Loops are so central HipHop program control flow that HipHop proposes
several loop constructs.

### loop { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHLoop)

Implements an infinite loop

&#x2605; Example: [sync1.hh.js](../../test/sync1.hh.js)


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


Derived Forms
-------------

### every delay { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHEvery)

A loop executed each time the delay is true. Abort the execution of 
the body when delay is true. Delays are documented [here](./signal#test-await-and-emit).

&#x2605; Example: [every1.hh.js](../../test/every1.hh.js)

All the delay forms can be used with `every`.
&#x2605; Example: [every-delay.hh.js](../../test/every-delay.hh.js)



The form `every` is a derived form. The form:

```javascript
every (expr) {
   ... body ...
}
```
is equivalent to

```javascript
await (expr);
loop {
  continue: fork {
    ... body ...
  } par {
    await (expr);
	break continue;
  }
}
```

### do { ... } every delay ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHDo)

Execute the `do`'s body and loop when `test` is true.

&#x2605; Example: [loopeach.hh.js](../../test/loopeach.hh.js)

The form `do`/`every` is a dericed form. The form:

```javascript
do { 
 ...
} every (expr);
```

is equivalent to:

```javascript
loop {
  ... body ...
  await (expr);
}
```

### abort delay { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHAbort)

Execute the `abort`'s body and abort the execution when delay is true.

&#x2605; Example: [abort-par.hh.js](../../test/abort-par.hh.js)

&#x2605; Example: [abortpre.hh.js](../../test/abortpre.hh.js)

The form:

```javascript
abort (expr) { ... body ... }

```

is equivalent to

```javascript
exit: fork {
  ... body ... 
} par {
  await (expr);
  break exit;
}
```

### weakabort delay { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHAbort)

Execute the `weakabort`'s body and abort the execution when delay is true
at the end of the reaction

&#x2605; Example: [loopeach-weakabort-emit.hh.js](../../test/loopeach-weakabort-emit.hh.js)

&#x2605; Example: [weak2.hh.js](../../test/weak2.hh.js)

&#x2605; Example: [weak-immediate.hh.js](../../test/weak-immediate.hh.js)

The form:

```javascript
abort (expr) { ... body ... }

```

is equivalent to

```javascript
exit: fork {
  ... body ... 
} par {
  await (expr);
  break exit;
}
```

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../../README.md) | [[documentation]](../README.md) | [[language]](../_lang.md) | [[license]](../license.md)

