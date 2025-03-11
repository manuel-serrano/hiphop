// prog0c.hh.mjs
import * as hh from "@hop/hiphop";

const prog0 = hiphop module() {
   inout I, J;
	
   loop {
      if (I.nowval - I.preval > 10) {
	 emit J();
      }
      yield;
   }
}

const m = new hh.ReactiveMachine(prog0);

m.addEventListener("J", v => console.log(v, m.age()));

m.react({I: 0});   // no J emitted
m.react({I: 1});   // no J emitted
m.react({I: 100}); // J emitted
m.react();         // no J emitted
m.react({I: 101}); // no J emitted
