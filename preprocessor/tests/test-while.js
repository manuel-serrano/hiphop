const hh = require("hiphop");
const m = new hh.ReactiveMachine(
   MODULE {
      IN a;
      WHILE(VAL(a) != 5) {
	 ATOM {
	    console.log("a != 5");
	 }
	 PAUSE;
      }
   }
);

m.react();
m.react();
m.inputAndReact("a", 5);
m.react();
