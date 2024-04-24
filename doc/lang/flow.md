<!-- ${ var doc = require("hopdoc") } -->

Control Flow Operators
======================

Sequence, Test, Yield, and Parallelism
--------------------------------------

### sequence ###

Sequences are implicit in HipHop. That is, two statements separated by
a `;` are executed sequentially. 


### pragma ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

<span class="syntax">&#x2606;</span> [Formal syntax](../syntax/hiphop.bnf#HHYield)

The `pragma` form executes a JavaScript statement during the reaction.

<span class="hiphop">&#x2605;</span> Example: [seq.hh.js](../../test/seq.hh.js)
<!-- ${doc.includeCode("../../test/seq.hh.js", "hiphop")} -->

The JavaScript body may have signal dependencies.

<span class="hiphop">&#x2605;</span> Example: [atom-dep-par.hh.js](../../test/atom-dep-par.hh.js)
<!-- ${doc.includeCode("../../test/atom-dep-par.hh.js", "hiphop")} -->

> [!CAUTION]
> Under no circumstances JavaScript side effects must be observable
> from within a HipHop reaction. It is the responsability of the
> JavaScript program not to execute visible side effects. If such
> a side effect happen and is observed from within a HipHop reaction,
> its behavior becomes unpredictable.

### if (delay) { block } [else { block }] ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

Execute the _then_ block is delay is true, execute the optional _else_
block otherwise. The `delay` [expression](./syntax/hiphop.bnf#HHDelay)
can be is a JavaScript that evaluates to a boolean. If that expression
uses signal attributes (`now`, `pre`, `nowval`, or `preval`), HipHop computes
a flow dependency in order to evalute the `delay` only when all the values
of these attributes are known for the instance. For instance, the
test:

```
if (!SIG.now) { ... }
```

depends on the `now` attribute of the signal `SIG`. It cannot be evaluated
before it is know that `SIG` is now emitted during the reaction. The HipHop
runtime system computes these dependencies automatically.

A particular value of a signal can also be checked. For instance:

```hiphop
if(SIG.nowval > 10 && SIG.nowval < 100) { host { console.log("signal in range") } }
```

See [staging](../staging.md) for using dynamic signal names in delay
expressions.

### yield ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHYield)

A thread of execution can suspend itself for the current instance using
the `yield` construct. The execution will resume after the `yield` when
the `react` method of the machine will be called again.

<span class="hiphop">&#x2605;</span> Example: [weak.hh.js](../../test/weak.hh.js)
<!-- ${doc.includeCode("../../test/weak.hh.js", "hiphop")} -->

<span class="hiphop">&#x2605;</span> Example: [trap-par-3.hh.js](../../test/trap-par-3.hh.js)
<!-- ${doc.includeCode("../../test/trap-par-3.hh.js", "hiphop")} -->


### fork { ... } par { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHFork)

Run all the bodies in parallel. Complete when all bodies have completed.

<span class="hiphop">&#x2605;</span> Example: [parallel-unary.hh.js](../../test/parallel-unary.hh.js)
<!-- ${doc.includeCode("../../test/parallel-unary.hh.js", "hiphop")} -->

This example uses two nested `fork` constructs. The second is synchronized
with the first as it waits for an event the first branch is to emit.


### halt ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

Terminate the current thread.

<span class="hiphop">&#x2605;</span> Example: [run-add-par.hh.js](../../test/run-add-par.hh.js)
<!-- ${doc.includeCode("../../test/run-add-par.hh.js", "hiphop")} -->


Loop
----

Loops are so central HipHop program control flow that HipHop proposes
several loop constructs, see [derived forms](#derived-forms). These are
all based on a combination of the elementary `loop` construct and
[lexical espaces](#lexical-escapes).


### loop { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHLoop)

This is the basis loop construct that implements an infinite loop

<span class="hiphop">&#x2605;</span> Example: [sync1.hh.js](../../test/sync1.hh.js)
<!-- ${doc.includeCode("../../test/sync1.hh.js", "hiphop")} -->

A loop can be interrupted by exiting with a `break` statement.

<span class="hiphop">&#x2605;</span> Example: [trap-loop.hh.js](../../test/trap-loop.hh.js)
<!-- ${doc.includeCode("../../test/trap-loop.hh.js", "hiphop")} -->

> [!NOTE]
> It is not permitted to implement _instantaneous_ loops, that is
> a loop for which two iterations may execute during the same reaction.
> This will be rejected by the compiler. All loops must have a `yield`
> statement in their control flow.


Suspension
----------

### suspend delay { block } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

Suspend the execution of `block` while `delay` is true.

<span class="hiphop">&#x2605;</span> Example: [suspend.hh.js](../../test/suspend.hh.js)
<!-- ${doc.includeCode("../../test/suspend.hh.js", "hiphop")} -->

<span class="hiphop">&#x2605;</span> Example: [trap-suspend.hh.js](../../test/trap-suspend.hh.js)
<!-- ${doc.includeCode("../../test/trap-suspend.hh.js", "hiphop")} -->


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

<span class="hiphop">&#x2605;</span> Example: [timeout.hh.js](../../test/timeout.hh.js)
<!-- ${doc.includeCode("../../test/timeout.hh.js", "hiphop")} -->

This example shows how to exit a `loop`.

<span class="hiphop">&#x2605;</span> Example: [trap-par.hh.js](../../test/trap-par.hh.js)
<!-- ${doc.includeCode("../../test/trap-par.hh.js", "hiphop")} -->

This example shows how to exit a `fork`/`par`.

<span class="hiphop">&#x2605;</span> Example: [trap-await-parallel.hh.js](../../test/trap-await-parallel.hh.js)
<!-- ${doc.includeCode("../../test/trap-await-parallel.hh.js", "hiphop")} -->

This example shows that several threads can decide to exit from a `fork`/`par`.

<span class="hiphop">&#x2605;</span> Example: [p18.hh.js](../../test/p18.hh.js)
<!-- ${doc.includeCode("../../test/p18.hh.js", "hiphop")} -->


Derived Forms
-------------

### every delay { ... } ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHEvery)

A loop executed each time the `delay` is true. Abort the execution of 
the body when `delay` is true. Delays are documented [here](./signal#test-await-and-emit).

<span class="hiphop">&#x2605;</span> Example: [every1.hh.js](../../test/every1.hh.js)
<!-- ${doc.includeCode("../../test/every1.hh.js", "hiphop")} -->

All the delay forms can be used with `every`.
<span class="hiphop">&#x2605;</span> Example: [every-delay.hh.js](../../test/every-delay.hh.js)
<!-- ${doc.includeCode("../../test/every-delay.hh.js", "hiphop")} -->


The form `every` is a derived form. The form:

```javascript
every (expr) {
   ... body ...
}
```
is equivalent to:

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

<span class="hiphop">&#x2605;</span> Example: [loopeach.hh.js](../../test/loopeach.hh.js)
<!-- ${doc.includeCode("../../test/loopeach.hh.js", "hiphop")} -->

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

<span class="hiphop">&#x2605;</span> Example: [abort-par.hh.js](../../test/abort-par.hh.js)
<!-- ${doc.includeCode("../../test/abort-par.hh.js", "hiphop")} -->

<span class="hiphop">&#x2605;</span> Example: [abortpre.hh.js](../../test/abortpre.hh.js)
<!-- ${doc.includeCode("../../test/abortpre.hh.js", "hiphop")} -->

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

<span class="hiphop">&#x2605;</span> Example: [loopeach-weakabort-emit.hh.js](../../test/loopeach-weakabort-emit.hh.js)
<!-- ${doc.includeCode("../../test/loopeach-weakabort-emit.hh.js", "hiphop")} -->

<span class="hiphop">&#x2605;</span> Example: [weak2.hh.js](../../test/weak2.hh.js)
<!-- ${doc.includeCode("../../test/weak2.hh.js", "hiphop")} -->

<span class="hiphop">&#x2605;</span> Example: [weak-immediate.hh.js](../../test/weak-immediate.hh.js)
<!-- ${doc.includeCode("../../test/weak-immediate.hh.js", "hiphop")} -->

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
[[main page]](../../README.md) | [[documentation]](../README.md) | [[language]](./README.md) | [[license]](../license.md)

