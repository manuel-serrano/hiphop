<!-- ${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) } -->

Async
=====

Hiphop `async` forms enables HipHop to control (i.e., abort, suspend,
resume, and react to) long lasting background JavaScript actions. They
are the essential ingredient for mixing undeterministic asynchronous
computations and deterministic synchronous computations. In other
words, the `async` form enables well-behaving synchronous to regulate
unsteady asynchronous computations.

### async [ident] { ... } [kill { ... }] [suspend { ... }] [resume { ... }]
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](./syntax/hiphop.bnf#HHAsync)

The `async` form executes a JavaScript statement and upon its completion, the
asynchronous block can resume the synchronous machine by calling one of the
functions that compose the `async` JavaScript API. When an `ident` is
specified with the `async` call, the JavaScript code will have the possibility
to emit a signal whose name is `ident` when the asynchronous block
completes or simply progresses.

A `async` statement blocks until its JavaScript body invokes the
`this.notify` method. In other words, an `async` statement completes
when its JavaScript body invokes the `notify` method.


### Example ###

This example spawns a JavaScript timer that will complete no sooner
than five seconds after being started. When the timeout is reached,
the JavaScript asynchronous computation resumes the reactive machine
and emit the signal `O` with the value `5`.

Inside the asynchronous block, the JavaScript `this` object is
a descriptor of the asynchronous computation.

&#x2605; [exec2.hh.js](../../test/exec2.hh.js)

### Kill, suspend, and resume ###

The optional arguments `kill`, `suspend`, and `resume` are JavaScript
statements that are executed when the HipHop statement state
changes. They give the opportunity to the JavaScript program to
cleanup a computation if the `async` block is preempted or
suspended or resumed. 

The following example shows a JavaScript `setTimeout` that is stopped
when the HipHop `async` statement is aborted.

&#x2605; [exec2.hh.js](../../test/local-kill2.hh.js)


Async JavaScript API
====================

JavaScript asynchronous blocks can use several functions to notify
the reactive machine that their state have changed.

Inside the body of an `async` form, `this` is bound to the reactive
machine executing asynchronous block. New reactions can be triggered
from within the `async` JavaScript block. Example:

&#x2605; [setinterval.hh.js](../../test/setinterval.hh.js)

This example uses the expression `Tick.signame` that is a JavaScript
expression that evaluates to the HipHop internal name of the signal
`Tick`.


### async.notify(value, [react = true]) ###
<!-- [:@glyphicon glyphicon-tag function] -->

This function notifies the reactive machine that the `async` form has
completed and it emits the event that was associated with the form. 

> [!NOTE]
> Notifying the termination of the `async` form with the method `notify`
> is not equivalent to triggering a new reaction as only the `notify`
> method tells HipHop to execute the next statement in sequence.

How and when the machine is notified depends of `value`'s type. Two
cases are considered:

 * `value` is anything but a JavaScript Promise: the machine is
 immediately notified and the value of the `async` associate event is `value`.
 * `value` is a Promise: the machine is notified only when the Promise
 resolves or rejects. The value of the associated event is an object whose
 property `resolve` is `true` if the Promise has resolved and `false` otherwise.
 The property `val` is the value with which the Promise has resolved or
 rejected.
 
Here is an example of an `async` block that uses a JavaScript Promise to
resume the HipHop computation.

&#x2605; [exec3.hh.js](../../test/exec3.hh.js)

The optional argument `react` controls whether a reaction should be 
automatically triggered with the notification. If the `react` is `true`,
a reaction to the machine is executed. The following asynchronous block:

```hiphop
async {
   this.notify("complete");
}
```

is equivalent to:

```hiphop
async {
   this.notify("complete", false);
   this.react();
}
```

### async.react(sigset) ###
<!-- [:@glyphicon glyphicon-tag function] -->

Invokes the `react` method with `sigset` argument of the machine
running the `async` block.

Inside an `async` block, the expression:

```hiphop
this.react( sigset )
```

is equivalent to:

```hiphop
this.machine.react( sigset )
```

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../../README.md) | [[documentation]](../README.md) | [[language]](../_lang.md) | [[license]](../license.md)



