${ var doc = require( "hopdoc" ) }
${ var path = require( "path" ) }
${ var ROOT = path.dirname( module.filename ) }

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
===================

Signals are declared in [module signatures](./module.html), possibly
via an [interface declaration](./module.html##Interface) or inside an
HipHop statement, with the [signal](./syntax.html#HHSignal) construct.

### signal [direction] ident [= value], ..., interface, ... ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHSignal)


Variable Declarations
=====================

### let ident [= value], ..., ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHLet)

Along with signals, HipHop supports local Hop variables. They are
local variable carrying Hop values. These variable can be used in all the
Hop expressions HipHop might used, for instance, for computing a delay,
for producing an emission value, or for running asynchronous  computation.



Using Signals in Expressions
============================

Signals presence (has a signal been emitted or not during the reaction)
and signal values can be used in HipHop JavaScript expressions. For that,
HipHop extend Hop expressions with 
[four syntactic constructs](./syntax.html#HHExpression). Notice that these
extensions are only available within the syntactic context of an HipHop 
expression:

### now( signal ) ###
[:@glyphicon glyphicon-tag syntax]

A predicate that is true if and only if `signal` has been emitted
during the reaction.
 
### pre( signal ) ###
[:@glyphicon glyphicon-tag syntax]

A predicate that is true if and only if `signal` has been emitted
during the _previous_ reaction.
 
### nowval( signal ) ###
[:@glyphicon glyphicon-tag syntax]

The current value of the signal. Note that values are preserved from
reaction to reaction so if a signal is emitted during reaction r1 and
not at reaction i1 + 1, getting the value at reaction i1 + 1 will
return the same value as reaction i1, although `now( signal )` at
reaction i1 + 1 will be false.
 
### preval( signal ) ###
[:@glyphicon glyphicon-tag syntax]

The value of the signal at the previous reaction.


Test, Await, and Emit
=====================

### if( expr ) { ... } [else { ... }] ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHIf)

The presence or absence of a signal can be checked with the `if`
conditional construct. The value of a signal can be checked too. The
`expr` argument is any Hop expression agumented with the signal
API. For instance, the presence of a signal can be checked with:

```hiphop
if( !now( SIG ) ) { hop { console.log( "signal not emitted in reaction" ) } }
```

A particular value of a signal can be checked. For instance:

```hiphop
if( nowval( SIG ) > 10 && nowval( SIG ) < 100 ) { hop { console.log( "signal in range" ) } }
```

### await delay ###
[:@glyphicon glyphicon-tag syntax]

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
 * `count( counter, expression )`, this waits for expression to be true
 `counter` times.

### emit signal( [ value ] ) ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHEmit)

The `emit` form emit the value in the instant. The form `emit sig1()` emits
a signal without value. The form `emit sig2( val )` emits a signal with
a value. 

${ <span class="label label-warning">Note:</span> } If a valued signal
is to be emitted several times within a single reaction it must be
declared with a combinaison function that is a Hop function that
__must__ be commutative and associative. It is up to the Hop program
to check and satisfy this requirement.

### sustain signal( [ value ] ) ###
[:@glyphicon glyphicon-tag syntax]

[Formal syntax](./syntax.html#HHSustain)

Similar to `emit` but the emission is repeated at each instant. The
statement  

```hiphop
sustain sig( expr )
```

is equivalent to

```hiphop
loop {
   sustain sig( expr );
   yield;
}
```


Examples
========

A module waiting sequentially for `A` and `B` to be emitted during
distinct reactions and that emits `O` right after `B` is received.

${ <span class="label label-info">await-seq.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/await-seq.hh.js" ) }
```

A module that waits the event `I` to be present in three distinctive instants.

${ <span class="label label-info">await-count.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/await-count.hh.js" ) }
```

A module using Hop variable inside HipHop statements. 

${ <span class="label label-info">variable.hh.js</span> }

```hiphop
${ doc.include( ROOT + "/../../tests/variable.hh.js" ) }
```
