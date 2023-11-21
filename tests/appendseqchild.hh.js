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
        host { mach.outbuf += "a" }
	yield;
        host { mach.outbuf += "b" }
	yield;
        host { mach.outbuf += "c" }
	yield;
      }
   }
}

const M = new hh.ReactiveMachine(main, "appendseqchild");

M.react();

const seq = M.getElementById("myseq");

seq.appendChild(makePar(() => mach.outbuf += "p1", () => mach.outbuf += "p2"));

M.react();
M.react();
