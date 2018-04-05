const hh = require("hiphop");

module.exports =  new hh.ReactiveMachine(
   MODULE (INOUT a, INOUT b, INOUT r, OUT o(0)) {
      LOOPEACH(NOW(r)) {
	 FORK {
	    AWAIT(NOW(a));
	 } PAR {
	    AWAIT(NOW(b));
	 }
	 EMIT o(PREVAL(o) + 1);
      }
   },
   { sweep: false, debuggerName: "abroDebug" }
);
