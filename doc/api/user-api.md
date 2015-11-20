${ var doc = require("hopdoc") }

# Introduction

# Compile from XML tree
This is the natural way to use __HipHop.js__. You just write legacy
JavaScript code, and then add an XML tree with specifics nodes which
automatically generate the reactive runtime.

The following items are XML tree nodes that you can use to write the
reactive code.

## ReactiveMachine

This is by order the root node of the XML tree that will build the
reactive machine. It must take a `name` attribute, and several children which are :

* zero or more input or output signals nodes (the ordering is
  moot point) ;

* the last child must be the first reactive instruction of the
  machine. If there is more than one instruction, consider the
  `sequence` node.

This node return an object, which is the reactive machine runtime. It
is needed to start reactions and set input signals.

### Debug mode
For debugging purposes, you can set `debug` attribute on XML node,
without value. Any reaction will be logged on the console.

### Start reactions
There is different way to trigger reactions. The following methods
applies on the object return by this XML node (the reactive machine runtime).

* automatic reaction : the attribute `auto\_react` take a positive
  integer, which is the time between two reaction. You also can use
  the method `auto\_react(milliseconds)`. If you want to stop the automatic reaction of the machine,
  just call `halt()` method.

* manual reaction : `react(seq\_number)` method with trigger a reaction
  of the machine. You must give as parameter a number strictly bigger
  than `seq` attribute of the reactive machine object.

## InputSignal

Defines an input signal of the reactive machine. It must be named
with the `name` attribute.

It can be valued by the `type` attribute. The type is a regular
predefined or user JavaScript type. If the signal is valued, it also
can have initialization value, with `init\_value` attribute (the type
must match with `type` attribute). If the type is `number` or
`boolean`, there also is a `combine\_with` attribute which can take
`+` or `\*` if number, or `and` or `or` if boolean. The
semantics is to applies this operator on the previous value and the
new value, when setting a value to the signal.

One can set an input signal from JavaScript regular code using the
`set\_input` method of the reactive machine. This method take the name
of the signal at first parameters, and a second optional parameters
which is the value to set on the signal, if valued. It's possible to
set a valued signal without new value, if it has been initialized before.

## OutputSignal

Defines an output signal of the reactive machine. It must be named
with the `name` attribute.

As the input signal, this kind of signal can have a `type`,
`combine\_with` and `init\_value` attributes, with the same semantics.

The `react\_functions` attribute takes a JavaScript function, or an
array of JavaScript functions, which will be call at the end of the
reaction if the signal has been emitted.

## LocalSignal

Defines a signal which access is limited inside the reactive code :
it's not possible to set or get the presence or the value of this
signal outside the reactive machine. As the input or output signals,
it can be valued with `type`, `combine\_with` and `init\_value`
attributes.

It takes one child, which is the code embedded the local signal.

## Present

The present node test the presence of a signal. It takes a
`signal\_name` attribute (that could be the name of any kind of
signal), and one or two children, which are the then branch, and the
optional else branch.

It is possible to test the presence of the signal on the previous
reaction, with `test\_pre` attribute, without value.

## Emit

Set the signal named by `signal\_name` attribute present for the
current reaction. If the signal is valued, it is possible to give to
it a new value, with the `expr` attribute. The value of this attribute
can be an object or primitive value of JavaScript, an HipHop.js
expression (see Expr), or the value of another signal (see SigExpr).

## SigExpr

Return the presence of signal named by `signal\_name`. It is possible to
get the presence of the previous reaction, using `get\_pre` attribute,
or the value of the signal, using `get\_value` attribute, both of them
without value. Of course, it is possible to get the value of the
previous reaction using this two attributes on the same instruction.

## Expr

Evaluate and return the value of the expression. The expression is
defined in host language via a JavaScript function given to `func`
attribute. The arity of this function is specified by the `exprs`
attribute, witch is an array of expression (sames rules of Emit's `expr` attribute).

## Pause
[:@glyphicon]

Stop the execution of the ReactiveMachine. Next reaction will begin
after this instruction.

## Await

Block the execution of the reactive machine if the signal named
by `signal\_name` attribute is not present when this statement is
reached. If no parallel branches are running, it will end the current reaction.

## Parallel

Takes two children.

## Sequence

Allow a sequence of multiples instructions. It is useful as child of
ReactiveMachine, Loop, or others instructions which takes only one child.

## Halt

Stop the current reaction, and block any others reactions at this
point. It's possible to recover it by embed it inside a Abort
instruction, for instance.

## Loop

__Warning__ : HipHip.js not detect cycles because of Loop yet. Be
careful to avoid it with Pause or others statements which are not
instantaneous.

## Run

Run instruction be be consider as a function call, but the callee is a
reactive machine and not a regular function. Because of the internal
state of a reactive machine, the callee reactive machine is copied
inside the caller, and the input / output signals of the callee must
be associated to input / output / local signals of the caller (local
signals of the callee must not be reached from the called). It takes
two arguments :

* `run\_machine` which is the runtime object of a reactive machine ;

* `sigs\_assoc` which is a JavaScript hashmap, where the key
  correspond to the name of a input / output signal of the callee and
  the value is the name of a signal in the caller.

In the following example, the caller is `run2` and the callee `m1` :

```hopscript
${ doc.include("../tests/run.js", 5, 29) }
```

## Sustain

__Warning__ : not tested yet.

## Nothing

Do nothing, equivalent of `nop` assembly instruction. Therefore, the
execution control directly jump to the next sequence instruction.

## Atom

Allow the execution of a JavaScript function, given to `func`
attribute. Not any modification of the internal state of the machine
(eg. update signal value) is allowed inside the callee function :
`set\_input` method will be inhibited.

## Trap

A trap must be named with `trap\_name` attribute. It takes one child,
with is the reactive code that could be preempted by the trap.

## Exit

An exit instruction must take the name of the related trap, via
`trap\_name` attribute. The following instructions will not be
executed, the the execution continues at the instruction following the
related trap.

# Compile from Esterel source code

# Examples

## Pure signal example

ABRO is a common reactive program in the synchronous languages
world. The program waits for a signal A and a signal B (in parallel,
so B can comes before A), and the emit a signal O. At any times, the
state of A or B can be reset via the emission of signal R.

```hopscript
${ doc.include("../tests/abro.js", 5, 22) }
```

Then, you can use `prg` to set signal A, B or R with the method
`set\_input` :

```hopscript
prg.set_input("A");
```

will set the signal A for the following reaction. Here follow an
complete example of execution :

```hopscript
prg.set_input("B");
prg.react(prg.seq + 1);
prg.set_input("A");
prg.react(prg.seq + 1);
```

As the `debug` attribute is given to the reactive machine, you will
see in the console :
```
ABRO> B;
--- Output:
ABRO> A;
--- Output: O
```

You can bind callbacks on output signals with `react\_functions`
attribute, according to the API.

## Valued signal example, with combine_with

```hopscript
${ doc.include("../tests/value1.js") }
```

On this example, the first `emit` instruction will erase the current
value of signal O and set it to 5, but will add the value of the
second emission. So O value's will be 15 at the end of reaction.

## More complex valued example

```hopscript
${ doc.include("../tests/value2.js") }
```

## Full example, with valued signal, interactions between JavaScript and HipHop.js

```hopscript
${ doc.include("../tests/mirror.js", 0, 42) }
```
