${ var doc = require("hopdoc") }


# Statements

## Module

### <hiphop.module> ###
[:@glyphicon glyphicon-tag tag]

Module is the programming unit of a Hiphop.js program. Therefore, any
Hiphop.js statement must be embedded inside a module.

```hopscript
<hiphop.module>
  <!-- Hiphop.js instructions -->
<hiphop.module>
```

## Basic control statement

### <hiphop.nothing/> ###
[:@glyphicon glyphicon-tag tag]

Terminates instantaneously when started. It a kind of _nop_
instruction, in assembly languages.

### <hiphop.pause/> ###
[:@glyphicon glyphicon-tag tag]

Pauses the branch where it is defined for the current instant. The
following instructions of the branch will be executed at the next
instant.

### <hiphop.halt/> ###
[:@glyphicon glyphicon-tag tag]

Pauses forever the branch where it is defined. It never terminates,
but it can be preempted.

### <hiphop.if> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* A delay expression.
* `not` (optional): logic negation of the result of the test.
* One child (then branch) or two (then and else branch).

Instantaneously evaluates the expression and gives control to the
_then_ or _else_ branch according to the result of the test.

The following example will emit `O1` if the signal `I1` is present,
and `O2` if the value of the signal `O2` is superior or equals to 2.

```hopscript
${ doc.include("../tests/if1.js", 10, 15) }
```

__Warning__: each child of the If instruction is considered as a
branch. Hence, the first child is the _then_ branch, and the second
child is the _else_ branch. On the following example, `<foo/>` will be
evaluated if `delay-expr` is true, and `<bar/>` will be evaluated if
`delay-expr` is false:

```hopscript
<hh.if delay-expr>
  <foo/>
  <bar/>
</hh.if>
```

If one want to evaluate `<foo/>` and `<bar/>` when `delay-expr` is
true, an explicit sequence must be used:

```hopscript
<hh.if delay-expr>
  <hh.sequence>
    <foo/>
    <bar/>
  </hh.sequence>
</hh.if>
```

## Signal emission

### <hiphop.emit/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* At least one signal name.
* An optional JavaScript expression.
* An optional conditional expression: `ifApply` (optional, takes a
  JavaScript functional value) or `ifValue` (optional, takes any
  JavaScript value).

Instantaneously sets given signals present in the current instant and
terminates. In an expression is given, it is evaluated and its return
value is affected to each given signal according the following rules:

* if the signal has never been emitted during the instant, the return
  value become the value of the signal;
* if the signal has already been emitted during the instant, and the
  signal provides a combination function, the value of the signal
  become the value return by the combination function evaluation;
* otherwise, the emission is forbidden, the reactive machine stops and
  an throws an error.

If a conditional expression is given (via `ifApply` or `ifValue`), and
if the result of this expression is false, the Emit instruction
instantaneously terminates without emit any signal.

In the following example `O` is emitted:

```hopscript
<hh.emit O/>
```

In the following example `O` is emitted with value `10`:

```hopscript
<hh.emit O value=${10}/>
```

In the following example `O` and `J` are emitted with the value of
`L`:

```hopscript
<hh.emit O J apply=${function() {return this.value.L}}/>
```

In the following example, `A` is emitted if `B` is present during the
reaction:

```hopscript
${doc.include("../tests/emit-if1.js", 8, 8)}
```

### <hiphop.sustain/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* At least one signal name.
* An optional JavaScript expression.
* An optional conditional expression: `ifApply` (optional, takes a
  JavaScript functional value) or `ifValue` (optional, takes any
  JavaScript value).
  
Instantaneously emit given signals, but never terminates, and will
always re-emit the signal on following reactions. The rules of Emit
statement applies here. If a conditional expression is given (via
`ifApply` or `ifValue`), given signals are emitted only if the result
of the expression is true.

It supports the same attributes than Emit statement.

In the following example, `J` is emitted at each reaction until the
emission of `I`:

```hopscript
${doc.include("../tests/sustain1.js", 8, 10)}
```

## Looping

### <hiphop.loop> ###
[:@glyphicon glyphicon-tag tag]

Children of the node:

* Takes at least one instruction.

The body of the Loop statement is instantaneously started, and then
instantaneously restarted when it reach the end of the loop. The Loop
never terminates, but can be preempted.

Because the loop is instantaneously restarted, ones must take care of
avoid instantaneous loop (a body that will terminate instantaneously,
without implicit of explicit pause instruction), which is forbidden by
the language.

In the following example `O` is emitted at each instant:

```hopscript
<hh.loop>
   <hh.emit O/>
   <hh.pause/>
</hh.loop>
```

In the following example `O` is emitted at each instant that the
signal `I` is present. The loop isn't instantaneous since the Await
instruction includes an implicit pause:

```hopscript
<hh.loop>
   <hh.await I/>
   <hh.emit O/>
</hh.loop>
```

The following example is not legal since the loop is instantaneous (it
will re-loop at the same instant):

```hopscript
<hh.loop>
   <hh.emit O/>
</hh.loop>
```

### <hiphop.loopeach> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* A delay expression.
* An optional counter expression.
* Take at least one child.

The body of the LoopEach statement is instantaneously started, and
then restarted each at each instant where the delay expression
elapses. This statement can't make instantaneous loop, so the body can
instantaneously terminates. LoopEach never terminates, but can be
preempted.

In the following example, `O` is emitted the first instant, and at
each following instants where `I` is present:

```hopscript
${ doc.include("../tests/loopeach.js", 7, 9) }
```

### <hiphop.every> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* A delay expression.
* An optional counter expression.
* Take at least one child.

The body of the Every statement is instantaneously started at each
instant where the delay expression elapses. However, on the first
instant, the body of Every is never started.

In the following example, `O` is not be emitted at the first
instant. It is emitted on the following instants if `I` is present:

```hopscript
${ doc.include("../tests/every1.js", 7, 9) }
```

## Preemption

### <hiphop.trap> ###
[:@glyphicon glyphicon-tag tag]

Attribute and children of the node:

* A trap name.
* Takes at least one child.

The body of the Trap instruction is instantaneously started, and can
be instantaneously exited at a specific point, via the Exit
instruction.

### <hiphop.exit/> ###
[:@glyphicon glyphicon-tag tag]

Attribute of the node:

* A trap name.

The exit point of a trap. It must be enclosed in the Trap
instruction. This instruction immediately terminate and jump to the
following instruction of the exited trap.

In the following example, the signal `B` is never emitted, whereas `A`
and `C` are emitted:

```hopscript
${ doc.include("../tests/trap.js", 8, 15) }
```

### <hiphop.abort> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* A delay expression.
* An optional counter expression.
* Take at least one child.

The Abort statement instantaneously start its body. The body is
instantaneously preempted and the Abort terminates at the instant
where the delay expression elapses.

In the following example, `S` is emitted at the first instant. On the
following reaction, `O` is not emitted, but `W` is emitted:

```hopscript
<hh.abort pre S>
   <hh.emit S/>
   <hh.pause/>
   <hh.emit O/>
</hh.abort>
<hh.emit W/>
```

### <hiphop.weakabort> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* A delay expression.
* An optional counter expression.
* Take at least one child.

The WeakAbort statement instantaneously start its body. The body is
preempted and the Abort terminates at the instant where the delay
expression elapses, but left the control to its body during this
instant.

In the following example, `S` is emitted at the first instant. On the
following reaction, both `O` and `W` are emitted:

```hopscript
<hh.weakabort pre S>
   <hh.emit S/>
   <hh.pause/>
   <hh.emit O/>
</hh.weakabort>
<hh.emit W/>
```

### <hiphop.suspend> ###
[:@glyphicon glyphicon-tag tag]

Attributes and children of the node:

* A delay expression.
* Take at least one child.

Instantaneously suspend its body when the delay expression
elapses. The state of the body is saved, and is restore of following
reaction, when the guard is not true.

In the following example, `O` is emitted at each reaction if `I` is
not present. However, `J` is never emitted:

```hopscript
<hh.suspend I>
   <hh.loop>
      <hh.emit O/>
      <hh.pause/>
   </hh.loop>
</hh.suspend>
<hh.emit J/>
```

One of the following attribute can be used in the Suspend instruction,
which represent a delay expression:

* until: takes a signal name as value;
* untilValue: takes any JavaScript value;
* untilApply: takes a JavaScript expression.

If any one of the previous form is used, the body is suspended, even
is the suspend delay expression is not true anymore. The body is
restarted when the until delay expression is true.

## Others statements

### <hiphop.await/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* A delay expression.
* An optional counter expression.

Instantaneously terminates when the delay expression elapses.

Note that if the delay expression elapses of the first time the await
has control, it will be ignored, except if `immediate` keyword is set.

The following example will emit `O` when `I` has been emitted on the
two previous reactions, and during the current reaction:

```hopscript
<hh.await I/>
<hh.await I/>
<hh.await I/>
<hh.emit O/>
```

However, because of the `immediate` keyword, the following example
will emit `O` on the same instant where `I` is emitted :

```hopscript
<hh.await immediate I/>
<hh.await immediate I/>
<hh.await immediate I/>
<hh.emit O/>
```

The following example waits for the presence of signal `I` an aleatory
number of times:

```hopscript
<hh.await I countApply=${function() {return Math.trunc(Math.randrom() * 10)}}/>
```

### <hiphop.atom/> ###
[:@glyphicon glyphicon-tag tag]

Attribute of the node:

* A JavaScript expression.

Instantaneously evaluate the given JavaScript expression.

The following example will display _atom works! value of L is foo bar_
during the second reaction:

```hopscript
${ doc.include("../tests/atom-exprs.js", 9, 13) }
```

### <hiphop.parallel> ###
[:@glyphicon glyphicon-tag tag]

Children of the node:

* At last one branch.

Gives instantaneously the control to its branches in parallel. It
terminates when all its branches have terminated.

The following example will emit `O` only when `A` and `B` have been
emitted (on current or previous reactions):

```hopscript
${ doc.include("../tests/await-par.js", 10, 14) }
```

### <hiphop.sequence> ###
[:@glyphicon glyphicon-tag tag]

Children of the node:

* At least two instructions.

Gives sequentially the control to each of its children, in the order
there are defined. The sequence is usually implicit. However, it can
be used to avoid ambiguous situations:

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
instruction 2 and 3 must be sequentially executed, the sequence is
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

* `module`: a Hiphop.js module.
* A list of optional signal bindings.

Instantaneously execute `module`. Terminates when `module` as
terminated. Signals in the callee module which have a same name
of signals in the caller module are automatically bound. Signals with
different name can be bound as the following:

```hopscript
<hh.run module=${fooModule} X=A Y=B/>
```

Signals `X` and `Y` for `fooModule` are respectively bound to
signals `A` and `B` of the caller module.

In the following example, the module `run2` calls `m1` :

```hopscript
${ doc.include("../tests/run.js", 5, 20) }
```

### <hiphop.exec/> ###
[:@glyphicon glyphicon-tag tag]

Attributes of the node:

* An optional signal name.
* `apply`: a JavaScript expression.
* `susp` (optional): function called when the exec statement is
  suspended;
* `kill` (optional): function called when the exec statement is
  killed;
* `res` (optional): function called when the exec statement is
  resumed.

The exec statement immediately call `apply` function. The `apply`
function must return immediately. It usually makes an asynchronous
call, or spawn a worker. One the asynchronous call, or worker, has
finish its work, it must notify the runtime by calling one of this
terminating functions:

* `this.return()`: will tells the runtime the exec is over.
* `this.returnAndReact()`: will tells the runtime the exec is over and
  will trigger an immediate reaction.

Exec statement is not instantaneous. It returns on the following
reaction after one terminating function call.

Note that `this.return()` and `this.returnAndReact()` can take an
optional value, if `signal` is given. In that case `signal` will be
instantaneously emitted when exec returns, which the given value.

The following example emit the signal `O` (with value `5`) 3 seconds
after the reaction:

```hopscript
${doc.include("../tests/exec2.js", 7, 11)}
```

# Signal declarations

### Global signals

Global signals indent to send and received values between the
environment (JavaScript) and the reactive Hiphop.js program, on which
any instruction can access to them. The definition of global signal
are in the Module instruction. The name of the signal must be a valid
JavaScript symbol. The following example define a reactive program
with 4 global signals, namely `A`, `B`, `C` and `signalD`:

```hopscript
<hiphop.module A B C signalD>
  <!-- Hiphop.js instructions -->
</hiphop.module>
```

Global signal are instantiated only one, when the reactive program is
compiled.

### Local signals

Local signals are invisible from the host language. A local signal is
defined in a Let instruction. The following example defines two local
signals, `local1` and `local2`:

```hopscript
<hh.let local1 local2>
  <!-- Hiphop.js instructions -->
<hh.let>
```

The body of the Let instruction is a scope. Only the instructions
embedded on it can access to signal `local1` and `local2`.

Local signal are instantiated when the control reach the Let
instruction. Therefore, if local signal are defined inside a Loop
instruction, new instances of signals will be made each time the Loop
re-loop. Any value or status of local signal of the previous iteration
are dropped.

For instance, in the following program, the output _S present_ is
never display. Indeed, even is `S` is emitted before re-looping, a new
local signal `S` is instantiated when re-looping. Therefore, the state
of `S` of the previous instance is lost:

```hopscript
<hh.let S>
   <hh.if S>
      <hh.atom apply=${function() {console.log("S present")}}/>
   </hh.if>
   <hh.pause/>
   <hh.emit S/>
</hh.let>
```

### Signal properties

Signals can be tuned by several specific properties. The properties
are given to the signal during its definition, through a JavaScript
object, as in the following examples:

```hopscript
<hh.module sig=${{initValue: 5}}> ... </hh.module>
<hh.let sig=${{initValue: 5}}> ... </hh.let>
```

#### Accessibility of a signal

By default, global signals can be read and write by the JavaScript
world. However, it is possible to restrict the access to write-only or
read-only. Accessibility attribute is ignored for local signals, as
they are by definition _hidden_ from the JavaScript world.

The accessibility is defined by the following attribute:

* `accessibility`

This attribute can takes one of the following values:

* `hh.IN`: signal is write-only from the JavaScript world.
* `hh.OUT`: signal is read-only from the JavaScript world.
* `hh.INOUT`: signal is read-write from the JavaScript world
  (default).

#### Initialization of signal

Signal can be automatically initialized with a value. If the signal is
global and has not been emitted via `input` method of the
ReactiveMachine, it is initialized before the first reaction. If the
signal is local, it is initialized when the control reach the Let
statement that defines the signal.

* `initValue`: takes any JavaScript value.
* `initApply`: takes a JavaScript functional value.

`initApply` works like JavaScript expression when `apply` is
used. Therefore, value of presence status of signal can be used in the
given JavaScript function.

#### Re-initialization of signal

Signal can be automatically re-initialized with a value. If the signal
is global and has not been emitted via `input` method of the
ReactiveMachine, it is re-initialized before each reaction. If the
signal is local, it is re-initialized before each reaction where the
control was left on the previous reaction into Let statement that
defines the signal.

* `reinitValue`: takes any JavaScript value.
* `reinitApply`: takes a JavaScript functional value.

`reinitApply` works like JavaScript expression when `apply` is
used. Therefore, value of presence status of signal can be used in the
given JavaScript function.

#### Combine signal

In order to be allowed to make multiple valued emission of the same
signal during the same instant, a combination function can be
given. It must be commutative, and takes two parameters: the former is
the value of the signal _before_ the emission, and the last, the
emitted value:

* `combine`: a JavaScript functional value.

For instance, the following example emits the signal `S` with the
value `6`:

```hopscript
<hh.module S=${{combine: (x, y) => x + y}}>
   <hh.emit S value=${2}/>
   <hh.emit S value=${1}/>
   <hh.emit S value=${3}/>
</hh.module>
```

# Expression

## JavaScript Expression

In Hiphop.js, a JavaScript expression is defined by one of the
following attribute:

* `value`: takes any JavaScript value.

* `apply`: takes a JavaScript functional value.

If `value` is used, the given JavaScript value is given to the
instruction using it. Therefore, this value never change during the
whole life of the program (except if the value is a reference to a
JavaScript object, and if this object is modified).

For instance, the following program emits the value `7` to signal `S`
at each reaction:

```hopscript
var x = 7;

<hh.module S>
   <hh.sustain S value=${x++}/>
</hh.module>
```
If `apply` is used, the given JavaScript functional value is evaluated
at runtime at each instant, if and when the Hiphop.js using it has
control. The return value is then given to the instruction. As this
expression is evaluated during the runtime, it can read signal status
and values which are in the scope. Those properties can be acceded via
the `this` object of the given function:

* `this.value.SignalName` returns the value of `SignalName` during the
  instant.

* `this.preValue.SignalName` returns the value of `SignalName` during
  the previous instant.

* `this.present.SignalName` returns a boolean telling if `SignalName`
  is emitted in the instant.

* `this.prePresent.SignalName` returns a boolean telling if
  `SignalName` was emitted in the previous instant.

The value returned by the expression is given to Hiphop.js
instruction. It can be used (in Emission statements, for instance) or
ignored (in Atom statement, for instance).

The following example show an expression used for conditional
branching test. `O1` is emitted if `I1` is present, and `O2` is
emitted if the value of `I2` more that 2:

```hopscript
${ doc.include("../tests/if1.js", 9, 17) }
```

The following example, signal `S` is emitted with its value on
previous instant incremented by 1, and signal `O` is emitted with the
`S` value:

```hopscript
${ doc.include("../tests/emitvaluedlocal1.js", 9, 10) }
```

## Delay Expression

A delay expression is a JavaScript expression. However, its return
value is used as the expression of a boolean test. The delay
expressions elapses if the test is true. The following behavior
depends of the instruction using this delay.

A delay expression can be specialized for signals status, using a
different syntax of the JavaScript expression. It contains a signal
name and an optional `pre` attribute. For instance, the following
instructions use a signal expression.

```hopscript
<hh.await SignalFoo/>
```

The signal expression is the name of the signal `SignalFoo`. It
returns true if `SignalFoo` is present in the instant, false otherwise.

```hopscript
<hh.await pre SignalBar/>
```

The signal expression is `pre SignalBar`. It returns true if
`SignalBar` was present on the previous instant, false otherwise.

## Counter Expression

Each time an instruction using a counter expression is started, it
initializes an internal counter with the return value of this counter
expression. That value must be a positive integer. It is defined with
one of the following attribute:

* `countValue`: takes any JavaScript value.

* `countApply`: takes a JavaScript functional value, evaluated at
  runtime.

As for JavaScript expressions, `countApply` can accesses to signal
presence and values, via the receiver of the given JavaScript
function.

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
