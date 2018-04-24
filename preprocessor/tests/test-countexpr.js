"use hopscript"

const hh = require("hiphop");
const m = new hh.ReactiveMachine(
   MODULE (IN i, OUT o) {
      PAUSE;
      EVERY COUNT(2, NOW(i)) {
	 EMIT o;
      }
   }
);

m.debug_emitted_func = console.log;
m.react();
m.inputAndReact("i", 1);
m.inputAndReact("i");
m.inputAndReact("i");
m.inputAndReact("i");
m.inputAndReact("i");
m.inputAndReact("i");
m.inputAndReact("i");
