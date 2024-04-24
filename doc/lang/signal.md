<!-- ${ var doc = require("hopdoc") } -->

HipHop Signals and Variables
============================

Signals enable HipHop components to communicate with one another. They
play a role akin to variables in traditional programming
languages. They are the central component to store and exchange
information between componnents. They also implement outside world
communications. A signal is identified by its name. It can be local,
i.e., defined locally inside a [module](./module.md) and invisible
outside this module, or global, that is defined as an input or as an
output of the main module.  Signals have a direction. A signal may be
an input from the outside world, an output to the outside world, or
used in both directions.

A signal can also carry a value. The value is specified by the
_emitter_ and transmitted to the _receiver_. If a same signal is to be
emitted several times during a reaction with different values,
a combination used to accumulate all the values must be specified when
the signal is declared. The combination function is an arbitrary
JavaScript but it _must_ be associative and commutative.

A signal has four attributes that are **invariant** during a reaction:

  * `now`: a boolean which is true if the signal is emitte during the reaction,
  and false otherwise.
  * `pre`: a boolean which is true if the signal is emitte during the 
  previous reaction, and false otherwise.
  * `nowval`: the value of the most recent emission of that signal.
  * `preval`: the value of the signal during the previous instant.
  
> [!NOTE]
> Note the asymmetry between `nowval` and `preval`. The attribute `nowval`
> _stores_ the most recent value emitted and it changes when a new emission
> happens. The attribute `preval` stores the value of the signal only at
> the previous reaction.

Variables are regular JavaScript variables. Assignments to variables
should never be observed during a reaction. That is, a variable should never
been read after having being assigned during a reaction. It is the 
responsibility of the program that ensure that this property holds.


Signal Declarations
-------------------

Signals are declared in [module signatures](./module.md), possibly
via an [interface declaration](./module.md##hiphop-interfaces) or inside an
HipHop statement, with the [signal](./syntax/hiphop.bnf#HHSignal) construct.

### signal [direction] ident [= value] [combine function] ... ###
<!-- [:@glyphicon glyphicon-tag syntax] -->
### signal [direction] ... ident, ident [= value] [combine function] ... ###
### signal implements [mirror] intf ... ###

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHSignal)

See the [module documentation](./module.md) for module signals.

The `signal` form enables to define local signals whose visibility is
restricted to the block that define them.  Example:

```javascript
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

[Module signals](./module.md) are declared with the keywords `in`,
`out`, and `inout`.  The signals can be used from outside of the
machine to pass values in or to receive values after a reaction.

<span class="hiphop">&#x2605;</span> Example: [samelocalname.hh.js](../../test/samelocalname.hh.js)
<!-- ${doc.includeCode("../../test/samelocalname.hh.js", "hiphop")} -->

** Multiple emission with combine functions **:

Signals can only be emitted once per instant, unless they are declared
with a default value and a combination function. If such a function
is specified, it must be associative and commutative. Signals associated
with a combination function can be emitted several time during the reaction.
The `.nowval` will contain all the values emitted during the reaction.

<span class="hiphop">&#x2605;</span> Example: [incr-branch.hh.js](../../test/incr-branch.hh.js)
<!-- ${doc.includeCode("../../test/incr-branch.hh.js", "hiphop")} -->

<span class="hiphop">&#x2605;</span> Example: [toggle.hh.js](../../test/toggle.hh.js)
<!-- ${doc.includeCode("../../test/toggle.hh.js", "hiphop")} -->

The form `signal implements [mirror] intf` declares locally the
signals declared in the interface `intf`. The optional keyword
`mirror` swaps the input and output signals.

<span class="hiphop">&#x2605;</span> Example: [imirror.hh.js](../../test/imirror.hh.js)
<!-- ${doc.includeCode("../../test/imirror.hh.js", "hiphop")} -->

Transient signals are declared with the addition of the `transient` keyword.
They do not save their `nowval` value from one instant to the other, 
contrary to plain signals that do.

<span class="hiphop">&#x2605;</span> Example: [transient.hh.js](../../test/transient.hh.js)
<!-- ${doc.includeCode("../../test/transient.hh.js", "hiphop")} -->

The form using the `...` syntax enables several signals to share the
same attributes. For instance in the declaration `in ... x, y, z = 1`,
the three signals `x`, `y, and `z` will be initialized to 1.

<span class="hiphop">&#x2605;</span> Example: [incr-branch2.hh.js](../../test/incr-branch2.hh.js)
<!-- ${doc.includeCode("../../test/incr-branch2.hh.js", "hiphop")} -->


Variable Declarations
---------------------

### let ident [= value], ..., ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHLet)

Along with signals, HipHop supports local Hop variables. They are
local variable carrying Hop values. These variable can be used in all the
Hop expressions HipHop might used, for instance, for computing a delay,
for producing an emission value, or for running asynchronous  computation.

<span class="hiphop">&#x2605;</span> Example: [variable.hh.js](../../test/variable.hh.js)
<!-- ${doc.includeCode("../../test/variable.hh.js", "hiphop")} -->


Using Signals in Expressions
----------------------------

Signals presence (has a signal been emitted or not during the
reaction) and signal values can be used in HipHop JavaScript
expressions. For that, HipHop analyses Hop expressions and detect
signal accesses. It recognizes
[four syntactic constructs](./syntax/hiphop.bnf#HHExpression) that
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

<span class="hiphop">&#x2605;</span> Example: [npnvpv.hh.js](../../test/npnvpv.hh.js)
<!-- ${doc.includeCode("../../test/npnvpv.hh.js", "hiphop")} -->

When executed with the following [input](/../../test/npnvpv.in) signals.
It generates the following [output](/../../test/npnvpv.out).

### signal.signame ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

Returns the JavaScript name of a signal. This is useful when dealing
with `async` forms (see [async documentation](./async.md)).


Await, and Emit
---------------

### await delay ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHAwait)

It is frequent for a program to wait for one or several signals to be
emitted. This can be acheived with the `await` construct, which waits
for a condition to be true. The `delay`
[expression](./syntax/hiphop.bnf#HHDelay) can be:

 * an simple HipHop expression as the one used in the `if` construct.
 * an HipHop expression prefixed with `immediate`. If `immediate` is
 specified, the waiting starts during the same reaction. Otherwise it only
 starts one reaction later. That is the form `await expr` is equivalent to `{
yield; await immediate expr }`. 
 * `count(counter, expression)`, this waits for expression to be true
 `counter` times.

The `await` form is derived form from the elementary `if` and `loop` constructs.
The form:

```javascript
await immediate (expr);
```

is equivalent to:

```javascript
loop {
  if (!expr) yield;
}
```

The form:

```javascript
await (expr)
```

is equivalent to:

```javascript
yield;
await immediate (expr);
```

The form:

```javascript
await count(5, expr)
```

is equivalent to:

```javascript
await (expr);
await (expr);
await (expr);
await (expr);
await (expr);
```

The form `await (delay)` is equivalent to:

```hiphop
endif: loop {
   yield;
   if (delay) break endif;
}
```
   

### emit signal([ value ]) ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHEmit)

The `emit` form emit the value in the instant. The form `emit sig1()` emits
a signal without value. The form `emit sig2(val)` emits a signal with
a value. 

> [!NOTE]
> If a valued signal
> is to be emitted several times within a single reaction it must be
> declared with a combinaison function that is a Hop function that
> __must__ be commutative and associative. It is up to the Hop program
> to check and satisfy this requirement.

### sustain signal([ value ]) ###
<!-- [:@glyphicon glyphicon-tag syntax] -->

&#x2606; [Formal syntax](../syntax/hiphop.bnf#HHSustain)

Similar to `emit` but the emission is repeated at each instant. The
statement

```javascript
sustain sig(expr);
```

is equivalent to

```javascript
loop {
   emit sig(expr);
   yield;
}
```


Examples
--------

A module waiting sequentially for `A` and `B` to be emitted during
distinct reactions and that emits `O` right after `B` is received.

<span class="hiphop">&#x2605;</span> [await-seq.hh.js](../../test/await-seq.hh.js)
<!-- ${doc.includeCode("../../test/await-seq.hh.js", "hiphop")} -->

A module that waits the event `I` to be present in three distinctive instants.

<span class="hiphop">&#x2605;</span> [await-count.hh.js](../../test/await-count.hh.js)
<!-- ${doc.includeCode("../../test/await-count.hh.js", "hiphop")} -->

A module using Hop variable inside HipHop statements. 

<span class="hiphop">&#x2605;</span> [variable.hh.js](../../test/variable.hh.js)
<!-- ${doc.includeCode("../../test/variable.hh.js", "hiphop")} -->


- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
[[main page]](../../README.md) | [[documentation]](../README.md) | [[language]](./README.md) | [[license]](../license.md)

