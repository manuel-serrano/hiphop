import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   in I; inout X, Y;
   emit Y();
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

mach.react("I");
mach.react({X: 15});
mach.react();
mach.react("Y");
