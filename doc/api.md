${ var doc = require("hopdoc") }

We use the following convention: XML nodes which has `/` at the end of
they name are always leafs, therefore, didn't accept any children.

# Modules and reactive machines

### <hiphop.module> ###
[:@glyphicon glyphicon-tag tag]

A module is an object that wrap an entire HipHop.js program, it's a
programming unit of HipHop.js. As any first class object, a module can
be call inside another module, via the `run` HipHop.js statement (see `<hiphop.run>`).

```hopscript
<hiphop.module>
  <!-- HipHop.js signal declarations -->
  <!-- HipHop.js statements and local signals -->
<hiphop.module>
```

### hiphop.ReactiveMachine ###
[:@glyphicon glyphicon-tag tag]

A reactive machine is an object that wrap an HipHop.js module, and
allow to interact with it. In other word, in instantiate a module to a
runnable program.

```hopscript
var prg =
<hiphop.module>
  <!-- HipHop.js program -->
<hiphop.module>

var machine = new hiphop.ReactiveMachine(prg, "prgName");

machine.react(); // trigger a reaction of the program
```

Instances of reactive machines provide the following API:

* `react()`: method that trigger an immediate reaction of the reactive
  machine, it returns an array of emitted output signals (with a
  possible value);

* `inputAndReact(signalName, value)`: method that set the input signal
  named by string `signalName`, and a possible value given by optional
  parameter `value`. Then, it trigger a reaction (and has the same
  return of `react()`).

* `addEventListener(signalName, functionalValue)`: method that map an
  output signal named by string `signalName` to a callback given by
  `functionalValue`. Then, at the end of following reactions, the
  callback will be called it the signal has been emitted. Several
  callbacks can be mapped to a same signal.

Callbacks given to `addEventListener(signalName, functionalValue)`
must take exactly one argument. This argument is an object containing
the following properties:

* `name`: name of the emitted output signal;

* `value`: value of the signal at the end of the reaction. This field
  exists only for valued signals. This field is immutable;

* `stopPropagation()` a method that, if called in the callback, will
  inhibit the call of others callback mapped on this signal.

# Signal declarations

Signals are logical object that can be received and emitted by a
HipHop.js module. There also can be used to interact from the outside
of HipHop.js world (with input or output signals), and for internal
execution of a program (local signals). Each signal declaration must
have `name` attribute declared.

Declaration of input or output signal must always be on the top of
HipHop.js module:

```hopscript
<hiphop.module>
  <hiphop.inputsignal name="I"/>
  <hiphop.outputsignal name="O"/>
  <!-- any HipHop.js statement or local signal declaration -->
</hiphop.module>
```
Declaration of local signal can be anywhere in a HipHop.js module:

```hopscript
<hiphop.localsignal name="I">
  <!-- any HipHop.js statement -->
</hiphop.localsignal>
```

### Local signals

Input and output signals are defined at scope of the module, so every
instructions can access to them, and there are visible from the
outside of the reactive machine (you can set value on input signal,
and get value from output signal). HipHop.js allow to create local
signal, invisible from outside the reactive machine. They create a
scope, and only instructions embodied inside can access them.

TODO: explains reincarnation, user point of view

```hopscript
${ doc.include("../tests/reincar.js", 9, 15) }
```

### Valued signals

Signals can also hold a value of any JavaScript type. The value
persist between two reactions. However, the first emission of the
signal during the reaction (or before, in case of input signal), will
erase the value.

To declare a valued signal, use the regular signal declaration (input,
output or local), and then add one of the following keyword:

* `valued` tells the signal is valued, and has not initial value;

* `init\_value=X` tells the signal is valued and initialized with `X` value.

There is two kind of valued signal, by default, the signal is
"single", that means it can be emitted only one by reaction.

#### Combined valued signals

Combined signals can be emitted several times during a reaction. To
this end, the signal declaration must provide a combination function,
which must be commutative and that takes two parameters: the old value,
and a value provided from a emit statement. Then the return value of
the function is the new value of the signal.

```hopscript
${ doc.include("../tests/value1.js", 6, 13) }
```

# Expressions

## Signal accessors

Signal accessors are used to give the value or the presence of a
signal as argument of an expression function. HipHop.js runtime ensure
the correct scheduling of the program (the expression evaluation will
wait for the emitters of a signal in case of signal access).

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

# Statements

## Basic control statement

### <hiphop.nothing/> ###
[:@glyphicon glyphicon-tag tag]

This statement terminate instantaneously when started, and give
control on the following statement. In other words, it just do nothing.

### <hiphop.pause/> ###
[:@glyphicon glyphicon-tag tag]

This statement pauses the branch where it is defined for the current
reaction. The following instructions of the branch will be executed at
the next reaction.

### <hiphop.halt/> ###
[:@glyphicon glyphicon-tag tag]

This statement pauses the branch where it is defined forever, it will
never terminate.

## Conditional branching

### <hiphop.present> ###
[:@glyphicon glyphicon-tag tag]

The present node test the presence of a signal. It takes a
`signal\_name` attribute (that could be the name of any kind of
signal), and one or two children, which are the then branch, and the
optional else branch.

It is possible to test the presence of the signal on the previous
reaction, with `test\_pre` attribute, without value.

### <hiphop.if> ###
[:@glyphicon glyphicon-tag tag]

Evaluate an expression which must return a boolean value. The
expression is given by a callback to the `exprs` attribute, or by a
signal presence (`rjs.present(sigName)` for instance), or a signal
value, if boolean.

This node takes one or two children, which are respectively the then
and else branches.

The following example will emit `O1` if the signal `I1` is present,
and `O2` if the value of the signal `O2` is superior or equals to 2.

```hopscript
${ doc.include("../tests/if1.js", 5, 21) }
```

## Signal emission

### <hiphop.emit/> ###
[:@glyphicon glyphicon-tag tag]

### <hiphop.sustain/> ###
[:@glyphicon glyphicon-tag tag]

## Looping

### <hiphop.loop> ###
[:@glyphicon glyphicon-tag tag]

### <hiphop.loopeach> ###
[:@glyphicon glyphicon-tag tag]

### <hiphop.every> ###
[:@glyphicon glyphicon-tag tag]

## Traps

### <hiphop.trap> ###
[:@glyphicon glyphicon-tag tag]

A trap defined a scope that can be exited at a specific point. The
scope (body) of the trap is immediately started when control reach the
trap. It takes children which is the enclosed code, and the following
attribute:

* `trap\_name`: a string that is the name of the trap.

### <hiphop.exit/> ###
[:@glyphicon glyphicon-tag tag]

The exit point of a trap. In must be enclosed in the trap to
exit. This instruction immediately terminate the trap to exit. It takes
the following attribute:

* `trap\_name`: a string that matches with the name of the trap to exit.

## Others statements

### <hiphop.await/> ###
[:@glyphicon glyphicon-tag tag]

This statement waits for a signal, and terminate when this signal is
emitted. It can be use with the following attributes:

* `signal\_name`: the name of waited signal;

* `test\_pre`: test the presence of the signal at the previous reaction
  (optional, didn't take value);

* `immediate`: terminate if the signal is present at the very first
  reaction of the program (optional, didn't take value);

* `count`: an integer which is the number of times the signal must be
  present before terminate (optional).

### <hiphop.parallel> ###
[:@glyphicon glyphicon-tag tag]

Execute its children in parallel. The parallel statement can be use
with at least one child.

### <hiphop.sequence> ###
[:@glyphicon glyphicon-tag tag]

Execute its children in sequence. The sequence statement can be use
with at least two child. In most cases, the sequence is implicit and
user doesn't need it. However, because of XML syntax, some cases can
be ambiguous:

```hopscript
<hiphop.parallel>
  <!-- instruction 1 -->
  <!-- instruction 2 -->
  <!-- instruction 3 -->
</hiphop.parallel>
```
Here, there will be three branches on the parallel. But if the
instruction 2 and 3 must not be in parallel, using sequence is needed:


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

A module can "call" another module via the run instruction. The callee
module is expanded inside the caller. In order to access to input and
output signals of the callee, we have to maps those signals on the
caller signals. It takes two arguments :

* `module` which is the runtime object of a reactive machine ;

* `sigs\_assoc` which is a JavaScript hashmap, where the key
  correspond to the name of a input / output signal of the callee and
  the value is the name of a signal in the caller.

In the following example, the caller is `run2` and the callee `m1` :

```hopscript
${ doc.include("../tests/run.js", 5, 29) }
```

### <hiphop.atom/> ###
[:@glyphicon glyphicon-tag tag]

Instantaneously executes a JavaScript function, and terminate. It can
be use with the following attributes:

* `func`: JavaScript callback to execute;

* `expr`: expression attribute, if arguments provided to the callback
  (optional).


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
