"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A combine (x, y) => x + y;
   
   fork {
      loop {
	 emit A(0);
	 yield;
      }
   } par {
      loop {
	 emit A(1);
	 host { console.log(A.nowval) }
	 yield;
      }
   } par {
      loop {
	 emit A(2);
	 host { console.log(A.nowval) }
	 yield;
      }
   }
}

let machine = new hh.ReactiveMachine(prg, "error2");

machine.debug_emitted_func = console.log;
machine.react()
machine.react()
machine.react()
machine.react()
machine.react()
