${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

Async
=====

Async forms implement long lasting background Hop (i.e., JavaScript)
actions. They are the essential ingredient for mixing undeterministic
asynchronous computation and deterministic synchronous
computations. In other words, the `async` form enables well-behaving
synchronous to regulate unsteady asynchronous computations.

### async [ident] { ... } [kill { ... }] [suspend { ... }] [resume { ... }]
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHAsync)

The `async` form execute a JavaScript statement that is supposed to
spawn a long lasting background computation. When this complete, the
asynchronous block can resume the synchronous machine by calling the
function that composes the `async` JavaScript API. When an `ident` is
specified with the `async` call, the JavaScript will have the possible
to emit a signal whose name is `ident` when the asynchronous block
completes or simply progresses.

### Example ###

This example spawns a JavaScript timer that will completes no sooner
than five seconds after being started. When the timeout is reached,
that JavaScript asynchronous computation resumes the reactive machine
and emit the signal `O` with the value `5`.

Inside the asynchronous block, the JavaScript `this` object is
a descriptor of the asynchronous computation.

${ <span class="label label-info">exec2.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/exec2.hh.js" ) }
```

### Kill, suspend, and resume ###

The optional arguments `kill`, `suspend`, and `resume` of `async`
blocks are JavaScript statements that are executed when the HipHop
statement state changes. They give the opportunity to the program to
cleanup a computation if the `async` block is preempted or to
suspend/resume it. It is up to JavaScript to stop and to free
resources if needed.

The following example shows a JavaScript `setTimeout` that is stopped
when the HipHop `async` statement is interrupted.

${ <span class="label label-info">local-kill2.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/local-kill2.hh.js" ) }
```

Async JavaScript API
====================

JavaScript asynchronous blocks can use several functions to notify
the reactive machine that their state have changed.

Inside the body of an `async` form, `this` is bound to the instance
of the currently executing asynchronous block. The current machine
executing that statement is retrieved with `this.machine`. 

New reactions can be spawned from with a. `async` block. Example:

```hiphop
${ doc.include( ROOT + "/../../tests/setinterval.hh.js" ) }
```

### async.notify( value, [ react = true ] ) ###
[:@glyphicon glyphicon-tag function]

This function notifies the reactive machine that the `async` form has
completed.

This function notifies the reactive machine that the `async` form has
completed and it emits the event that was associated with the form. How and 
when the machine is notified depends of `value`'s type. Two cases are
considered:

 * `value` is anything but a JavaScript Promise: the machine is
 immediately notified and the value of the `async` associate event is `value`.
 * `value` is a Promise: the machine is notified only when the Promise
 resolves or rejects. The value of the associated event is an object whose
 property `resolve` is `true` if the Promise has resolved and `false` otherwise.
 The property `val` is the value with which the Promise has resolved or
 rejected.
 
Here is an example of an `async` block that uses a JavaScript Promise to
resume the HipHop computation.

${ <span class="label label-info">exec3.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/exec3.hh.js" ) }
```

The optional argument `react` controls whether a reaction should be 
automatically triggered with the notification. If the `react` is `true`,
a reaction to the machine is executed. The following asynchronous block:

```hiphop
async {
   this.notify( "complete" );
}
```

is equivalent to:

```hiphop
async {
   this.notify( "complete", false );
   this.react();
}
```

### async.react( sigset ) ###
[:@glyphicon glyphicon-tag function]

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


