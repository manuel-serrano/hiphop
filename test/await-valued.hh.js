"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";
import { format } from "util";

function foo( evt ) {
   mach.outbuf += "foo called by " + evt.signame + " with value " + evt.nowval + "\n";
}

hiphop module prg() {
   in I; out O;
   await (I.now);
   emit O(I.nowval);
}

export const mach = new hh.ReactiveMachine(prg, "awaitvalued");
mach.outbuf = "";
mach.addEventListener( "O", foo);

