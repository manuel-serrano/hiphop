"use hopscript"

const hh = require("hiphop");
const m = new hh.ReactiveMachine(MODULE {
   FORK toto {
      LOOP {
	 ATOM {
	    console.log("old child!");
	 }
	 PAUSE;
      }
   }
});

m.react();

let par = m.getElementById("toto");
//console.log(par);
par.appendChild(LOOP {
   ATOM {
      console.log("new child!")
   };
   PAUSE;
});

m.react()
