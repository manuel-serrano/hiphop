# Batch interpreter

Hiphop.js provides an batch interpreter, usable with a reactive
machine.

The commands of the batch interpreter are the following:

* `;` triggers a reaction;
* `X` sets the input signal X to present for the next reaction;
* `.` quits the batch interpreter;
* `!reset;` reinitialize the internal state of the reactive, as if it
  was just compiled.

Values can be given to valued signal as the following:

* `X(5)` sets the signal X present for the next reaction, and sets its value to 5;
* `Y(foo bar)` sets the signal Y present for the next reaction, and
   sets its value to the string `foo bar`;
* `Z({"a": 5, "b":"foo bar"})` sets the signal Z present for the next
  reaction, and sets its value to a JavaScript object corresponding to
  the given JSON representation.

# Symbolic debugger

# Hack Hiphop.js

PDF arch-hiphopjs.pdf
