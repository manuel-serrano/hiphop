# Batch interpreter

Hiphop.js provides an batch interpreter, usable with a reactive
machine. It takes input commands on standard input, and display
results of reaction on standard output. It started this way:

```hopscript
import * as hiphop from "@hop/hiphop";
const prg = <hh.Module> ... </hh.Module>;
const machine = new hh.ReactiveMachine(prg);

hh.batch(machine); // starts the batch interpreter
```

The commands of the batch interpreter are the following:

* `;` triggers a reaction;
* `X` sets the input signal X to present for the next reaction;
* `.` quits the batch interpreter (`batch` function call returns);
* `!reset;` reinitialize the internal state of the reactive, as if it
  was just compiled;
* `!pretty-print;` display the AST of the program. Instructions
  suffixed by `\*` are selected.

Values can be given to valued signal as the following:

* `X(5)` sets the signal X present for the next reaction, and sets its value to 5;
* `Y(foo bar)` sets the signal Y present for the next reaction, and
   sets its value to the string `foo bar`;
* `Z({"a": 5, "b":"foo bar"})` sets the signal Z present for the next
  reaction, and sets its value to a JavaScript object corresponding to
  the given JSON representation.

# Symbolic web debugger

TO BE RE-IMPLEMENTED.
