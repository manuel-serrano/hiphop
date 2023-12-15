<!-- ${ var doc = require("hopdoc") }
${ var path = require("path") }
${ var ROOT = path.dirname(module.filename) } -->

HipHop signals
==============

Signals enable HipHop components to communicate with one
another. They also implement outside world communications. A signal is
identified by its name. It can be local, i.e., defined locally inside
a [module](./module.html) and invisible outside this module, or global,
that is defined as an input or as an output of the main module.
Signals have a direction. A signal may be an input from the outside
world, an output to the outside world, or used in both directions.

A signal can also carry a value. The value is specified by the
_emitter_ and transmitted to the _receiver_. A same signal can be
emitted several times during a reaction but it that signal is valued,
a combination used to accumulate all the values must be specified when
the signal is declared. The combination function is an arbitrary
JavaScript but it _must_ be associative and commutative.


Signal Declarations
-------------------

Signals are declared in [module signatures](./module.html), possibly
via an [interface declaration](./module.html##Interface) or inside an
HipHop statement, with the [signal](./syntax.html#HHSignal) construct.

### signal [direction] ident [= value] [combine function] ... ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[Formal syntax](./syntax.html#HHSignal)

See the [module documentation](./module.md) for module signals.

The `signal` form enables to define local signals whose visibility is
restricted to the block that define them.  Example:

```hiphop
hiphop module M() {
  in S1; // module bound signal
  yield;
  signal L; // local signal only visible in the current block
  fork {
    await (S1.now);
    emit L(true);
  par {
    await (L.now);
  }
}
```

Example: [samelocalname.hh.js](../../test/samelocalname.hh.js)

Variable Declarations
---------------------

### let ident [= value], ..., ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[Formal syntax](./syntax.html#HHLet)

Along with signals, HipHop supports local Hop variables. They are
local variable carrying Hop values. These variable can be used in all the
Hop expressions HipHop might used, for instance, for computing a delay,
for producing an emission value, or for running asynchronous  computation.


Using Signals in Expressions
----------------------------

Signals presence (has a signal been emitted or not during the
reaction) and signal values can be used in HipHop JavaScript
expressions. For that, HipHop analyses Hop expressions and detect
signal accesses. It recognizes
[four syntactic constructs](./syntax.html#HHExpression) that
correspond to signal access. Notice that these detections are only
executed within the syntactic context of an HipHop expression:

### signal.now ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

A predicate that is true if and only if `signal` has been emitted
during the reaction.
 
### signal.pre ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

A predicate that is true if and only if `signal` has been emitted
during the _previous_ reaction.
 
### signal.nowval ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

The current value of the signal. Note that values are preserved from
reaction to reaction so if a signal is emitted during reaction r1 and
not at reaction i1 + 1, getting the value at reaction i1 + 1 will
return the same value as reaction i1, although `signal.now` at
reaction i1 + 1 will be false.
 
### signal.preval ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

The previous value of the signal. The previous value corresponds to
the value of the previous signal emission. Notice that the previous
emission is not supposed to have happened during the previous
reaction.

The following example illustrates the various values of `now`, `pre`, `nowval`,
and `preval` along instants.

Example: [npnvpv.hh.js](../../test/npnvpv.hh.js)

When executed with the following [input](/../../test/npnvpv.in) signals.
It generates the following [output](/../../test/npnvpv.out).

### signal.signame ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

Returns the JavaScript name of a signal. This is useful when dealing
with `async` forms (see [async documentation](./async.md)).


Test, Await, and Emit
---------------------

### if (expr) { ... } [else { ... }] ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[Formal syntax](./syntax.html#HHIf)

The presence or absence of a signal can be checked with the `if`
conditional construct. The value of a signal can be checked too. The
`expr` argument is any Hop expression agumented with the signal
API. For instance, the presence of a signal can be checked with:

```hiphop
if(!SIG.now) { host { console.log("signal not emitted in reaction") } }
```

A particular value of a signal can be checked. For instance:

```hiphop
if(SIG.nowval > 10 && SIG.nowval < 100) { host { console.log("signal in range") } }
```

### await delay ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[Formal syntax](./syntax.html#HHAwait)

It is frequent for a program to wait for one or several signals to be
emitted. This can be acheived with the `await` construct, which waits
for a condition to be true. The `delay` [expression](./syntax.html#HHDelay)
can be:

 * an simple HipHop expression as the one used in the `if` construct.
 * an HipHop expression prefixed with `immediate`. If `immediate` is
 specified, the waiting starts during the same reaction. Otherwise it only
 starts one reaction later. That is the form `await expr` is equivalent to `{
yield; await immediate expr }`. 
 * `count(counter, expression)`, this waits for expression to be true
 `counter` times.

### emit signal([ value ]) ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[Formal syntax](./syntax.html#HHEmit)

The `emit` form emit the value in the instant. The form `emit sig1()` emits
a signal without value. The form `emit sig2(val)` emits a signal with
a value. 

${ <span class="label label-warning">Note:</span> } If a valued signal
is to be emitted several times within a single reaction it must be
declared with a combinaison function that is a Hop function that
__must__ be commutative and associative. It is up to the Hop program
to check and satisfy this requirement.

### sustain signal([ value ]) ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

[Formal syntax](./syntax.html#HHSustain)

Similar to `emit` but the emission is repeated at each instant. The
statement  

```hiphop
sustain sig(expr);
```

is equivalent to

```hiphop
loop {
   emit sig(expr);
   yield;
}
```


Examples
--------

A module waiting sequentially for `A` and `B` to be emitted during
distinct reactions and that emits `O` right after `B` is received.

[await-seq.hh.js](../../test/await-seq.hh.js)

A module that waits the event `I` to be present in three distinctive instants.

[await-count.hh.js](../../test/await-count.hh.js)

A module using Hop variable inside HipHop statements. 

[variable.hh.js](../../test/variable.hh.js)

