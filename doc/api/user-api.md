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

* zero or more `inputsignal` and `outputsignal` nodes (the ordering is
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

As the `InputSignal`, this kind of signal can have a `type`,
`combine\_with` and `init\_value` attributes, with the same semantics.

The `react\_functions` attribute takes a JavaScript function, or an
array of JavaScript functions, which will be call at the end of the
reaction if the signal has been emitted.

## LocalSignal

## Present

## Emit

## SigExpr

## Expr

## Pause

## Await

## Parallel

## Sequence

## Halt

## Loop

## Run

## Sustain

## Nothing

## Atom

## Trap

## Exit

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

## Valued signal example

## Full example, with valued signal, interactions between JavaScript and HipHop.js
