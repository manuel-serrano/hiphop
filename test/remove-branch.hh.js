"use @hop/hiphop";
"use hopscript";

import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   out O combine (x, y) => x + y;
   loop {
      fork "par" {
	 emit O(1);
      }
      yield;
      yield;
   }
}

function add_emit(mach) {
   let branch = hiphop emit O(1);

   mach.getElementById("par").appendChild(branch);
   return branch;
}

export const mach = new hh.ReactiveMachine(prg, { name: "incr-branch", sweep: false, dynamic: true });
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react();
mach.react();
mach.react();
mach.react();
let br1 = add_emit(mach);
mach.react();
mach.react();
mach.react();
add_emit(mach);
add_emit(mach);
add_emit(mach);
mach.react();
mach.react();

mach.getElementById("par").removeChild(br1);

mach.react();
mach.react();
