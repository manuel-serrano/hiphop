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

* `signal`: a string that represents the signal to test;
* `pre`: test presence of the signal at the previous instant;
* `not` (optional): logic negation of the result of the test;
* one child (then branch) or two (then and else branch).


Tests the presence of a signal, and immediately terminates, giving the
control to the _then_ or _else_ branch, according to the result of the test.

The following example will emit the signal `T` in the instant where
the signal `S` is present:

```hopscript
<hh.present signal="S">
   <hh.emit signal="T"/>
</hh.present>
```

### <hiphop.if> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* `value`: an expression;
* `not` (optional): logic negation of the result of the test;
* takes one child (then branch) or two (then and else branch).

Instantaneously evaluate the expression, and gives control to the
_then_ or _else_ branch.

The following example will emit `O1` if the signal `I1` is present,
and `O2` if the value of the signal `O2` is superior or equals to 2.

```hopscript
${ doc.include("../tests/if1.js", 12, 17) }
```

## Signal emission

### <hiphop.emit/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `signal`: a string that represents the signal to emit;
* `value`: an optional expression

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

The following example will instantaneously emit the signal `O`:

```hopscript
<hh.emit signal="O"/>
```

The following example will instantaneously emit the signal `O` with value `10`:

```hopscript
<hh.emit signal="O" value=10/>
```

The following example will instantaneously emit the signal `O` with
value of a signal `L`:

```hopscript
<hh.emit signal="O" value=${function() {return this.value.L}}/>
```

### <hiphop.sustain/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `signal`: a string that represents the signal to emit;
* `value`: an optional expression

This statement instantaneously emit a signal, but never terminates,
and will always re-emit the signal on following reactions. The rules
of Emit statement applies here.

It supports the same attributes than Emit statement.

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

The following example will emit the signal `O` at each instant:

```hopscript
<hh.loop>
   <hh.emit signal="O"/>
   <hh.pause/>
</hh.loop>
```

The following example will emit the signal `O` at each instant that
the signal `I` is present. The loop isn't instantaneous thanks to the
Await statement, which is not instantaneous, in the following form:

```hopscript
<hh.loop>
   <hh.await signal="I"/>
   <hh.emit signal="O"/>
</hh.loop>
```

However, the following example is not legal, because the loop is
instantaneous (it will re-loop on the same instant):

```hopscript
<hh.loop>
   <hh.emit signal="O"/>
</hh.loop>
```

### <hiphop.loopeach> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* `signal`: a string that represents the signal to emit, and an
  optional counter expression;

* __OR__ a guard.

* Take at least one child.

The body of the instruction is instantaneously started, and then
restarted each time the guard is true. This statement can't make
instantaneous loop, so the body can instantaneously terminates.

### <hiphop.every> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* `signal`: a string that represents the signal to
  emit, and an optional counter expression;

* __OR__ a guard.

* Takes at least one child.

As LoopEach, this temporal loop start its body each times the guard is
true. However, as the contrary of LoopEach, Every initially waits for
the guard before starting its body.

## Preemption

### <hiphop.trap> ###
[:@glyphicon glyphicon-tag tag]

Attribute and children of the node:

* `name`: a string that represents the trap
* Takes at least one child.

A trap defines a scope that can be exited at a specific point. The
scope (body) of the trap is immediately started when control reach the
trap.

### <hiphop.exit/> ###
[:@glyphicon glyphicon-tag tag]

Attribute of the node:

* `trap`: a string that represents the name of the trap to exit.

The exit point of a trap; it must be enclosed in the trap to
exit. This instruction immediately terminate and jump to the following
instruction of the exited trap.

In the following example, the signal `B` will not be emitted, whereas
`A` and `C` will be emitted:

```hopscript
${ doc.include("../tests/trap.js", 11, 18) }
```

### <hiphop.abort> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* `signal`: a string that represents the signal to
  emit, and an optional counter expression;

* __OR__ a guard.

* Takes at least one child.

This statement immediately preempted its body when its guard is true,
and terminates.

The following example will be preempted and instantaneously terminated
when the signal `S` was present on the previous instant. As the first
instruction is to emit `S` and pause, the remain instruction (emit
`O`) will be preempted on the following instant:

```hopscript
${doc.include("../tests/abortpre.js", 10, 14)}
```

### <hiphop.weakabort> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* `signal`: a string that represents the signal to
  emit, and an optional counter expression;

* __OR__ a guard.

* Takes at least one child.

Like Abort, this instruction makes a preemption of its body. However,
when the guard is true, WeakAbort preempts its body only after the
instant which made the guard true.

It supports the same attributes than Abort statement.

### <hiphop.suspend> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* `signal`: a string that represents the signal to
  emit;

* __OR__ `value`: an expression.

* Takes at least one child.

This instruction immediately preempts its body when `signal` is
present, or when `value` evaluation is true in the instant. In this
case, the state (registers) of the body are unmodified.

Unlike the preemption Abort, Suspend doesn't terminates when it
preempts its body, but makes a pause.

## Others statements

### <hiphop.await/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `signal`: a string that represents the signal to emit;
* `immediate` (optional);
* `counter`: an optional expression.

This statement waits for a signal, and instantaneously terminate in
the instant that the signal is present. Note that if the signal is
emitted of the very first reaction of the reactive machine, it will be
ignored, except if `immediate` keyword is set.

The following example will emit `O` when `I` has been emitted 3 times:

```hopscript
<hh.await signal="I"/>
<hh.await signal="I"/>
<hh.await signal="I"/>
<hh.emit signal="O"/>
```

However, because of the `immediate` keyword, the following example
will emit `O` on the same instant where `I` is emitted :

```hopscript
<hh.await immediate signal="I"/>
<hh.await immediate signal="I"/>
<hh.await immediate signal="I"/>
<hh.emit signal="O"/>
```

The following example will waits for the presence of signal `I` an
aleatory number of times:

```hopscript
<hh.await signal="I" counter=${function() {Math.trunc(Math.randrom() * 10)}}/>
```

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
  <instruction1/>
  <instruction2/>
  <instruction3/>
  ...
  <instructionN/>
</hiphop.parallel>
```

Here, there will be N branches executed in parallel. But if the
instruction 2 and 3 must not be in parallel, using sequence is
mandatory:

```hopscript
<hiphop.parallel>
  <instruction1/>
  <hiphop.sequence>
    <instruction2/>
    <instruction3/>
  </hiphop.sequence>
  ...
  <instructionN/>
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

### <hiphop.exec/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* `signal` (optional): bind the (optional) return value of an exec to
  a signal;
* `start`: function called when control reaches the exec statement;
* `susp` (optional): function called when the exec statement is
  suspended;
* `kill` (optional): function called when the exec statement is
  killed;
* `res` (optional): function called when the exec statement is
  resumed.

The exec statement immediately call `start` function which must return
immediately. It usually makes an asynchronous call, or spawn a
worker. One the asynchronous call, or worker, has finish its work, it
must notify the runtime by calling one of this terminating functions:

* `this.return()`: will tells the runtime the exec is over.
* `this.returnAndReact()`: will tells the runtime the exec is over and
  will trigger an immediate reaction.

Exec statement is not instantaneous. It returns on the following
reaction after one terminating function call.

Note that `this.return()` and `this.returnAndReact()` can take an
optional value, if `signal` is given. In that case `signal` will be
instantaneously emitted when exec returns, which the given value.

# Signal declarations

### Global signals

Global signals indent to send and received values between the
environment (JavaScript) and the reactive Hiphop.js program. _Input
signals_ can be used only to send values from the environment to the
reactive program, _output signals_ can be used only to send values
from the reactive program to the environment, and _IO signals_ can do
both. Global signal emission are instantaneously broadcast throughout
the whole reactive program, and are visible from any instruction of
the program.

Declaration of global signal must always be on the top of Hiphop.js
module:

```hopscript
<hiphop.module>
  <hiphop.inputsignal name="I"/>
  <hiphop.outputsignal name="O"/>
  <hiphop.iosignal name="IO"/>
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

Hiphop.js allow to create local signal, invisible for the
environment. There are defined on a local scope, defined by `<Let>
... </Let>`. Instructions embedded in this node are the only ones that
can access to signal also defined in this scope. It must be defined as
the following :

* first children must be signal declared in the scope ;
* others children must be Hiphop.js instructions (or scope).

This example creates a scope for a local signal `S`:

```hopscript
${ doc.include("../tests/reincar.js", 9, 16) }
```

### Valued signals

Signals can also hold a value of any JavaScript type. The value
persist between two instant. However, the first emission of the
signal during the instant (or before, in case of input signal), will
erase the value.

To declare a valued signal, use the regular signal declaration (input,
output or local), and then add one of the following keyword:

* `valued` tells the signal is valued, and has not initial value;
* `value=X` tells the signal is valued and initialized with `X` value.

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

* `combine`: takes a JavaScript function.

```hopscript
${ doc.include("../tests/value1.js", 6, 13) }
```

It is possible to automatically reinitialize an combined signal at the
beginning of each reaction:

* `reset` takes a JavaScript function, that return a value that
  initializes the signal.

As `combine` or `reset` implicitly tells that the signal
is valued, `valued` keyword is optional.

# Expression

JavaScript expressions can be given to Hiphop.js program, via Hop.js
constructor `\$\{any-JS-expression}`.

## Functional value expression

If the expression is a functional value, it will be evaluated by the
Hiphop.js runtime. The following pattern must be used:

```hopscript
$\{function() \{ ... \}\}
```

In this function, `this` is bound to the signal scope. Therefore,
signals can be read via the following expressions:

* `this.value.SignalName` returns the value of `SignalName` during the
  instant;

* `this.preValue.SignalName` returns the value of `SignalName` during
  the previous instant;

* `this.present.SignalName` returns a boolean telling if `SignalName`
  is emitted in the instant;

* `this.prePresent.SignalName` returns a boolean telling if
  `SignalName` was emitted in the previous instant.

The value returned by the expression is given to Hiphop.js program if
needed. The following example show an expression used to conditional
branching test:

```hopscript
${ doc.include("../tests/if1.js", 6, 20) }
```

The following example show an expression used to emit a value to a
signal:

```hopscript
${ doc.include("../tests/emitvaluedlocal1.js", 6, 18) }
```

### Atomic expression

If the functional value containing the expression is between Hiphop.js
instruction, it is then considered as an Atom statement. An atom
statement is executed instantaneously, can make sides effects, and can
read signal values as well. The return value is ignored.

Here is an example of use of atomic statement:

```hopscript
${ doc.include("../tests/atom-exprs.js", 6, 17) }
```

## Non-functional value expression

If the expression is not a functional value, it is evaluated during
Hiphop.js compilation. Therefore, the value return by the evaluation
will never change at Hiphop.js runtime.

## Guard

Any instruction that takes a guard accepts the following attributes:

* `value`: an expression

* `count`: an expression

When the instruction is initially started, `count` expression is
evaluated and its result is internally kept by Hiphop.js runtime. Each
times the instruction has control, the `value` expression is
evaluated. If its result is `true`, the internal counter is
decremented.

If the internal counter reaches `0`, the guard return `true`, and
`false` otherwise.

**Warning**: the `count` expression must always return a positive
integer.

# Runtime & Reactive machine

A reactive machine is an instance of a Hiphop.js program. It provides
a JavaScript API allowing interactions between imperative world and
reactive world:

* `react()`: method that trigger an immediate reaction of the reactive
  machine, it returns an array of emitted output signals (with a
  possible value);
* `input(signalName \[, value\])`
* `inputAndReact(signal \[, value\])`: method that set the input
  signal named by string `signal`, and a possible value given by
  optional parameter `value`. Then, it trigger a reaction (and has the
  same return that `react()`). The `signal` parameter can also takes
  an object that contains at least a `signalName` property, and an
  optional `signalValue` field. In this case, `value` argument is
  ignored.
* `addEventListener(signalName, functionalValue)`: method that map an
  output signal named by string `signalName` to a callback given by
  `functionalValue`. Then, at the end of following reactions, the
  callback will be called it the signal has been emitted. Several
  callbacks can be mapped to a same signal.
* `removeEventListener(signalName \[, functionalValue\])`: remove a
  previously added event listener via `addEventListener`. If
  `functionalValue` argument is undefined, all event listener attached to
  the signal `signalName` are removed.
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
  DOM element will automatically be updated by the new value. It can
  be use only on valued signals.

Callbacks given to `addEventListener` must take exactly one
argument. This argument is an object containing the following
properties:

* `signalName`: name of the emitted output signal;
* `signalValue`: value of the signal at the end of the reaction. This field
  exists only for valued signals. This field is immutable;
* `stopPropagation()` a method that, if called in the callback, will
  inhibit the call of others callback mapped on this signal.

The following example show how is build a reactive machine, and how to
start a reaction.

```hopscript
const hh = require("hiphop");

const prg =
   <hh.module>
     <!-- Hiphop.js program -->
   <hh.module>

var machine = new hh.ReactiveMachine(prg, "prgName");

machine.react(); // trigger a reaction of the program
```

Markdown finished at Wed Aug 10 18:10:58
