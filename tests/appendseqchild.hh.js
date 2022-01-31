"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

function makePar(x, y) {
   return hiphop fork {
      host { x() }
   } par {
      host { y() }
   }
}

hiphop module main() {
   "myseq" {
      loop {
        host { console.log("a") }
	yield;
        host { console.log("b") }
	yield;
        host { console.log("c") }
	yield;
      }
   }
}

const M = new hh.ReactiveMachine(main, "appendseqchild");

M.react();

const seq = M.getElementById("myseq");

seq.appendChild(makePar(() => console.log("p1"), () => console.log("p2")));

M.react();
M.react();
