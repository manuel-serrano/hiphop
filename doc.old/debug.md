# Batch interpreter

Hiphop.js provides an batch interpreter, usable with a reactive
machine. It takes input commands on standard input, and display
results of reaction on standard output. It started this way:

```hopscript
const hh = require("hiphop");
const prg = <hh.Module> ... </hh.Module>;
var machine = new hh.ReactiveMachine(prg);

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

A symbolic debugger is provided by Hiphop.js. It allows to display the
running source code of a Hiphop.js program through a web browser. The
following conventions are used:

* Signal names are written in _red_ if the signal is emitted, in
  _blue_ otherwise.

* Instruction which had been executed are written on a green
  background.

After each reaction, the colors are automatically updated in order to
reflect the actual state of the program.

## Enabling / disabling the debugger

A reactive machine `m` provides the following API:

* `m.debuggerOn("_debugger\_name_")`: enables the debugger. The entry
  point is available at the address `http://_host_/hop/_debugger\_name_`.
* `m.debuggerOff()`: disables the debugger.

If _debugger\_name_ is already used by another debugger, it is
automatically disabled.

## Using the debugger

* It is possible to inspect the value of global signals by moving the
  mouse over a signal name. An information bubble containing the
  signal value will appear.
