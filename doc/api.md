${ var doc = require("hopdoc") }


# Statements

## Module

### <hiphop.module> ###
[:@glyphicon glyphicon-tag tag]

Module is the programming unit of a Hiphop.js program. Therefore, any
Hiphop.js statement must be embedded inside a module. As any first
class object, a module can be call inside another module, via the
Run Hiphop.js statement (see `<hiphop.run>`).

```hopscript
<hiphop.module>
  <!-- Hiphop.js input/output signal declarations -->
  <!-- Hiphop.js statements and local signals declarations -->
<hiphop.module>
```

## Basic control statement

### <hiphop.nothing/> ###
[:@glyphicon glyphicon-tag tag]

This statement terminate instantaneously when started, and give
control on the following statement; it is like a _nop_ assembly
instruction.

### <hiphop.pause/> ###
[:@glyphicon glyphicon-tag tag]

This statement pauses the branch where it is defined for the current
instant. The following instructions of the branch will be executed at
the next instant.

### <hiphop.halt/> ###
[:@glyphicon glyphicon-tag tag]

This statement pauses forever the branch where it is defined; it will
never terminate. However, it can be preempted (see preemption section).

## Conditional branching

### <hiphop.present> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* `signal\_name`: a string that represents the signal to test;
* `test\_pre`: test presence of the signal at the previous instant;
* `not` (optional): logic negation of the result of the test;
* one child (then branch) or two (then and else branch).


Tests the presence of a signal, and immediately terminates, giving the
control to the _then_ or _else_ branch, according to the result of the test.

### <hiphop.if> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* a standard expression;
* `not` (optional): logic negation of the result of the test;
* takes one child (then branch) or two (then and else branch).

Evaluate the given expression, and immediately gives control to the
_then_ or _else_ branch, according to the result of the expression.

The following example will emit `O1` if the signal `I1` is present,
and `O2` if the value of the signal `O2` is superior or equals to 2.

```hopscript
${ doc.include("../tests/if1.js", 5, 21) }
```

## Signal emission

### <hiphop.emit/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `signal\_name`: a string that represents the signal to emit;
* if the signal is valued, an optional standard expression.

This statement immediately set the signal present. If an expression is
given (and the signal is valued), the expression is evaluated an the
return value is affected to the signal, according the following rules:

* if the signal has never been emitted during the instant, the return
  value become the value of the signal;
* if the signal has already been emitted during the instant, and the
  signal provides a combination function, the value of the signal
  become the value return by the combination function evaluation;
* otherwise, the emission is forbidden, the reactive machine stops and
  an throws an error.

At instant level, a signal has only one value, which is the value when
all emitters has been executed.

### <hiphop.sustain/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `signal\_name`: a string that represents the signal to emit;
* if the signal is valued, an optional standard expression.

This statement is the same of Emit, but never terminates, and will
always re-emit the signal on following reactions. The rules of Emit
statement applies here.

## Looping

### <hiphop.loop> ###
[:@glyphicon glyphicon-tag tag]

Takes at least one child.

The body of the instruction is instantaneously started, and then
instantaneously restarted when it reach the end of the loop. The Loop
can be preempted.

Because the loop is instantaneously restarted, ones must take care of
avoid instantaneous loop (a body that will terminate instantaneously;
in other words, without pause), which is forbidden by the language.

### <hiphop.loopeach> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* __Either__ `signal\_name`: a string that represents the signal to
  emit; and an optional a counter expression;
* __or__, a standard expression;
* takes at least one child.

The body of the instruction is instantaneously started, and then
restarted each time the guard is true. This statement can't make
instantaneous loop, so the body can instantaneously terminates.

### <hiphop.every> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* __Either__ `signal\_name`: a string that represents the signal to
  emit; and an optional a counter expression;
* __or__, a standard expression;
* takes at least one child.

As LoopEach, this temporal loop start its body each times the guard is
true. However, as the contrary of LoopEach, Every initially waits for
the guard before starting its body.

## Preemption

### <hiphop.trap> ###
[:@glyphicon glyphicon-tag tag]

Attribute and children of the node:

* `trap\_name`: a string that represents the trap;
* takes at least one child.

A trap defines a scope that can be exited at a specific point. The
scope (body) of the trap is immediately started when control reach the
trap.

### <hiphop.exit/> ###
[:@glyphicon glyphicon-tag tag]

Attribute of the node:

* `trap\_name`: a string that represents the name of the trap to exit.

The exit point of a trap; it must be enclosed in the trap to
exit. This instruction immediately terminate and jump to the following
instruction of the exited trap.

In the following example, the output signal `B` will not be
emitted, whereas `A` and `C` will be emitted:

```hopscript
${ doc.include("../tests/trap.js", 6, 20) }
```

### <hiphop.abort> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* __Either__ `signal\_name`: a string that represents the signal to
  emit; and an optional counter expression;
* __or__ a standard expression;
* takes at least one child.

This statement immediately preempted its body when its guard is true,
and terminates.

### <hiphop.weakabort> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* __Either__ `signal\_name`: a string that represents the signal to
  emit; and an optional counter expression;
* __or__ a standard expression;
* takes at least one child.

Like Abort, this instruction makes a preemption of its body. However,
when the guard is true, WeakAbort preempts its body only after the
instant which made the guard true.

### <hiphop.suspend> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* __Either__ `signal\_name`: a string that represents the signal to
  emit;
* __or__ a standard expression;
* takes at least one child.

This instruction immediately preempts its body when its guard is true
in the instant. In this case, the state (registers) of the body are
unmodified.

Unlike the preemption Abort, Suspend doesn't terminates when it
preempts its body, but makes a pause.

## Others statements

### <hiphop.await/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `signal\_name`: a string that represents the signal to emit;
* `immediate` (optional)
* an optional counter expression.

This statement waits for a signal, and instantaneously terminate in
the instant that the signal is present. Note that if the signal is
emitted of the very first reaction of the reactive machine, it will be
ignored, except if `immediate` keyword is set.

### <hiphop.parallel> ###
[:@glyphicon glyphicon-tag tag]

Attribute and children of the node:

* `id` (optional): a string that acts as an identifier;
* takes at least one child.

Execute its children in parallel. An unique identifier can be given by
the attribute `id`, that allow a user to get the parallel program
node, like an HTML DOM node. It can by done via `getElementById()`
method of the reactive machine.

Then, it is possible to dynamically add branches to the parallel
between two reactions, via the `appendChild()` method of the parallel
node. If the user keeps a reference to the branch which is added, it
is also possible to remove the branch to further reactions, via
`removeChild()` method.

### <hiphop.sequence> ###
[:@glyphicon glyphicon-tag tag]

Takes at least two children.

Execute its children in sequence. The sequence statement can be use
with at least two child. In most cases, the sequence is implicit and
ones doesn't need it. However, because of XML syntax, some cases are
ambiguous:

```hopscript
<hiphop.parallel>
  <!-- instruction 1 -->
  <!-- instruction 2 -->
  <!-- instruction 3 -->
</hiphop.parallel>
```
Here, there will be three branches executed in parallel. But if the
instruction 2 and 3 must not be in parallel, using sequence is mandatory:


```hopscript
<hiphop.parallel>
  <!-- instruction 1 -->
  <hiphop.sequence>
    <!-- instruction 2 -->
    <!-- instruction 3 -->
  </hiphop.sequence>
</hiphop.parallel>
```
### <hiphop.run/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `module`: a Hiphop.js module;
* `sigs\_assoc`: a hashmap that keys are names of signals of the callee
  module, and values are names of signals of the caller module.

A module can "call" another module with this instruction. The callee
module is expanded inside the caller. In order to access to input and
output signals of the callee, we have to maps those signals on the
caller signals.

In the following example, the module `run2` calls `m1` :

```hopscript
${ doc.include("../tests/run.js", 5, 29) }
```

### <hiphop.atom/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `func`: takes a JavaScript function;
* `arg` (only if exactly one argunent): value given to `func` when its
  called;
* `argX` (`X` from 0 to N, increment by 1, when more that one
  argument): values given to `func` when its called.

Instantaneously executes a JavaScript function, and terminate. It
takes a standard expression as attribute; however, the `func`
argument of the expression is mandatory, and its potential return
value is meaningless.


### <hiphop.exec/> ###
[:@glyphicon glyphicon-tag tag]


# Signal declarations

A Hiphop.js program talks with the environment (a Hop.js program) via
_signals_. _Input signals_ intents to give information from
environment to Hiphop.js program, whereas _output signals_ intents to
give information from Hiphop.js program to the environment.

Declaration of input or output signal must always be on the top of
Hiphop.js module:

```hopscript
<hiphop.module>
  <hiphop.inputsignal name="I"/>
  <hiphop.outputsignal name="O"/>
  <!-- any Hiphop.js statement or local signal declaration -->
</hiphop.module>
```

The attribute `name` is mandatory: it is the identifier of the
signal. Theses kind of signal are known as _pure signals_: they only
hold a presence of absence information for an instant. Signal presence
is reset at each instant; therefore, a signal emitted on a instant
will not be present on the following instant (except if it is
re-emitted).

### Local signals

Input and output signals are defined at scope of the module, so every
instructions can access to them, and there are visible on the
environment via the reactive machine's API. However, Hiphop.js allow
to create local signal, invisible for the environment. They create a
scope, and only instructions embodied inside can access them.

TODO: explains reincarnation, user point of view

Declaration of local signal can be anywhere in a Hiphop.js module, for
instance, the following code create a scope for a local signal `S`:

```hopscript
${ doc.include("../tests/reincar.js", 9, 15) }
```

### Valued signals

Signals can also hold a value of any JavaScript type. The value
persist between two instant. However, the first emission of the
signal during the instant (or before, in case of input signal), will
erase the value.

To declare a valued signal, use the regular signal declaration (input,
output or local), and then add one of the following keyword:

* `valued` tells the signal is valued, and has not initial value;
* `init\_value=X` tells the signal is valued and initialized with `X` value.

There is two kind of valued signal, by default, the signal is
_single_, that means it can be emitted only once for each instant.

#### Combined valued signals

_Combined signals_ can be emitted several times during in a
instant. To this end, the signal declaration must provide a
combination function, which must be commutative and that takes two
parameters: the old value, and a value provided from a emit
statement. Then the return value of the function becomes the value of
the signal. A combination function is given with the following
keyword:

* `combine\_with`: takes a JavaScript function.

```hopscript
${ doc.include("../tests/value1.js", 6, 13) }
```

It is possible to automatically reinitialize an combined signal at the
beginning of each reaction:

* `reinit\_func` takes a JavaScript function, that return a value that
  initializes the signal.

As `combine\_with` or `reinit\_func` implicitly tells that the signal
is valued, `valued` keyword is optional.

# Expressions and guards

Expressions are embedded inside several Hiphop.js' nodes as part a
set of attributes.

## Standard expressions

Attributes that compose a standard expression:

* `func` (nested only if zero of more than one argument): a JavaScript
  function;
* `arg` (only if exactly one argunent): value given to `func` when its
  called;
* `argX` (`X` from 0 to N, increment by 1, when more that one
  argument): values given to `func` when its called.

A standard expressions is a way to compute and provide values
during a reaction. It can be of different nature:

* a JavaScript value;
* the value or the presence of a Hiphop.js signal (via signal accessors);
* the result of evaluation of a JavaScript function (with optional
  arguments, which can be JavaScript value, of signals value and
  presence).

Standard expressions can be use to provide values to signals (on
emission statements), and as guard. The guard is true if the value
returned by the evaluation of the expression is true, according to
JavaScript conventions (so, it can be any value different that
`false`, `null`, `0` or `undefined`). Except for emission statements
and Atom statement, any other use of expression is as guard.

## Counter expressions

Attributes that compose a counter expression:

* __Either__ `func\_count` (nested only if zero of more than one
  argument): a JavaScript function;
* `arg\_count` (only if exactly one argunent): value given to
  `func\_count` when its called;
* `arg\_countX` (`X` from 0 to N, increment by 1, when more that one
  argument): values given to `func\_count` when its called;
* __or__ `count`: an integer that represents a temporal guard. This is
  the number of times the signal guard or expression must be true.

A counter expression is a Hiphop.js expression used as guard that
is true after a counter reaches 0. This counter embedded inside
Hiphop.js runtime. It is initialized each time the instruction
containing the counter is started, and it is decremented in different
contexts, according to the instruction.

The initialization value can be an integer, or the value return by an
expression (evaluated when the instruction is started).

## Signal accessors

Signal accessors allows to get the state or the value of a signal
inside a Hiphop.js expression. Using theses accessors ensure that the
Hiphop.js runtime will correctly schedule the access to the signal
(e.g. read the value only when all emission instruction has been
executed).

**Warning**: a Hiphop.js signal must be used **only** with expression arguments.

### hiphop.present(signalName) ###
[:@glyphicon glyphicon-tag tag]

This constructor takes the name of the signal as argument, an return a
boolean to the expression the presence of the signal during the
current reaction.

### hiphop.prePresent(signalName) ###
[:@glyphicon glyphicon-tag tag]

This constructor takes the name of the signal as argument, an return a
boolean to the expression the presence of the signal during the
previous reaction.

### hiphop.value(signalName) ###
[:@glyphicon glyphicon-tag tag]

This constructor takes the name of the signal as argument, an return
the value of the signal during the current reaction. Note that the
language forbid to use the current value of a signal to emit itself.

### hiphop.preValue(signalName) ###
[:@glyphicon glyphicon-tag tag]

This constructor takes the name of the signal as argument, an return
the value of the signal during the previous reaction.

The following example will emit signal `I` with value `3`, `O` with
value of `I` (which is `3`), `U` with the value of `O` (which is `3`):

```hopscript
${ doc.include("../tests/valuepre1.js", 6, 16) }
```


# Runtime & Reactive machines

### hiphop.ReactiveMachine ###
[:@glyphicon glyphicon-tag tag]

A reactive machine is an object that wrap an Hiphop.js module, and
allow to interact with it. In other word, in instantiate a module to a
runnable program.

```hopscript
const hh = require("hiphop");

const prg =
<hh.module>
  <!-- Hiphop.js program -->
<hh.module>

var machine = new hh.ReactiveMachine(prg, "prgName");

machine.react(); // trigger a reaction of the program
```

Instances of reactive machines provide the following API:

* `react()`: method that trigger an immediate reaction of the reactive
  machine, it returns an array of emitted output signals (with a
  possible value);
* `setInput(signalName, \[, value\])`
* `inputAndReact(signalName \[, value\])`: method that set the input signal
  named by string `signalName`, and a possible value given by optional
  parameter `value`. Then, it trigger a reaction (and has the same
  return that `react()`).
* `addEventListener(signalName, functionalValue)`: method that map an
  output signal named by string `signalName` to a callback given by
  `functionalValue`. Then, at the end of following reactions, the
  callback will be called it the signal has been emitted. Several
  callbacks can be mapped to a same signal.
* `removeEventListener(signalName, functionalValue)`: remove a
  previously added event listener via `addEventListener`.
* `getElementById(parallelIdentifier)`: returns a parallel node
  corresponding to the given identifier, if exists.
* `save()`: save and returns the state of the reactive machine (value
  of signals, registers).
* `restore(state)`: restore a previous state of the reactive machine.
* `reactProxy(signalName)`: returns a JavaScript proxy that contains a
  value referenced by the `value` attribute. This value can be set to
  any DOM element. It will build a dependency between the DOM element
  which contains this value and the Hiphop.js signal. Therefore, at
  the end of each reaction that modified the value of the signal, the
  DOM element will automatically be updated by the new value. It is
  some kind of dataflow approach. It can be use only on valued
  signals.

Callbacks given to `addEventListener` must take exactly one
argument. This argument is an object containing the following
properties:

* `signalName`: name of the emitted output signal;
* `signalValue`: value of the signal at the end of the reaction. This field
  exists only for valued signals. This field is immutable;
* `stopPropagation()` a method that, if called in the callback, will
  inhibit the call of others callback mapped on this signal.


# Full examples

## Pure signal example

ABRO is a common reactive program in the synchronous languages
world. The program waits for a signal `A` and a signal `B` (in
parallel, so `B` can comes before `A`), and the emit a signal `O`. The
state of `A` or `B` can be reset via the emission of signal `R` at any
moment.

```hopscript
${ doc.include("../tests/abro.js", 0, 18) }
```

Then, you can define a reactive machine to instantiate the module, and
bind functions to emission of `O`:

```hopscript
var machine = new hh.ReactiveMachine(prg, "ABRO");

machine.addEventListener("O", function(evt) {
   console.log(evt.signal + " emitted!");
});

console.log("emit B and react");
prg.inputAndReact("B");
console.log("emit A and react");
prg.inputAndReact("A");
```
You will see in the console:

```
emit B and react
emit A and react
O emitted!
```

## Valued signal example, with combined signal

```hopscript
${ doc.include("../tests/value1.js", 0, 13) }
```

On this example, the first `emit` instruction will erase the current
value of signal `O` and set it to `5`, but will add the value of the
second emission. So `O` value's will be `15` at the end of reaction.

## More complex valued example

```hopscript
${ doc.include("../tests/value2.js", 0, 20) }
```
