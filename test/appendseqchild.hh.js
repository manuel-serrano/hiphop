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
        host { mach.outbuf += "a\n" }
	yield;
        host { mach.outbuf += "b\n" }
	yield;
        host { mach.outbuf += "c\n" }
	yield;
      }
   }
}

export const mach = new hh.ReactiveMachine(main, { name: "appendseqchild", sweep: false });
mach.outbuf = "";
mach.react();

const seq = mach.getElementById("myseq");

seq.appendChild(makePar(() => mach.outbuf += "p1\n", () => mach.outbuf += "p2\n"));

mach.react();
mach.react();
