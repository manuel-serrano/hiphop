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

Example:

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

The optional `async` arguments `kill`, `suspend`, and `resume` are
JavaScript statements that are executed when the HipHop `async` statement
state changes. They give the opportunity to the program to cleanup a
computation if the `async` block is preempted or to suspend/resume it.


Async JavaScript API
====================

JavaScript asynchronous blocks can use several functions to notify
the reactive machine that their state have changed.

### async.notify( value ) ###
[:@glyphicon glyphicon-tag function]

### async.notifyAndReact( value ) ###
[:@glyphicon glyphicon-tag function]

### async.react( value ) ###
[:@glyphicon glyphicon-tag function]

An `async` block using a JavaScript promise to resume the
HipHop computation.

${ <span class="label label-info">exec3.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/exec3.hh.js" ) }
```

Async blocks with `kill` handlers:

${ <span class="label label-info">local-kill.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/local-kill.hh.js" ) }
```
