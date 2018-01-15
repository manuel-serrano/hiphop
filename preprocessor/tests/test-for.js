const hh = require("hiphop");
const m = new hh.ReactiveMachine(
   MODULE {
      IN a;
      FOR(l(VAL(a)); VAL(l) != 5; EMIT l(VAL(a))) {
	 ATOM {
	    console.log("a != 5; l != 5");
	 }
	 PAUSE;
      }
   }
);

m.react();
m.react();
m.inputAndReact("a", 5);
m.react();
