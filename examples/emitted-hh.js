const hh = require("hiphop", "hopscript");

module.exports = new hh.ReactiveMachine(
   MODULE (OUT a, OUT b, OUT c) {
      EMIT a(5);
      EMIT c;
      PAUSE;
      EMIT b(10);
      EMIT a;
   }
);
