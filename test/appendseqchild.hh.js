import * as hh from "@hop/hiphop";

function makePar(x, y) {
   return hiphop fork {
      pragma { x() }
   } par {
      pragma { y() }
   }
}

hiphop module main() {
   "myseq" {
      loop {
        pragma { mach.outbuf += "a\n" }
	yield;
        pragma { mach.outbuf += "b\n" }
	yield;
        pragma { mach.outbuf += "c\n" }
	yield;
      }
   }
}

export const mach = new hh.ReactiveMachine(main, { name: "appendseqchild", sweep: false, dynamic: true });
mach.outbuf = "";
mach.react();

const seq = mach.getElementById("myseq");

seq.appendChild(makePar(() => mach.outbuf += "p1\n", () => mach.outbuf += "p2\n"));

mach.react();
mach.react();
