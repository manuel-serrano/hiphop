import * as hh from "@hop/hiphop";
import { format } from "util";

hiphop module prg() {
   inout A, B;
   emit A(); emit B();
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += format(val) + "\n";
}

try {
   mach.react()
   mach.react()
} catch(e) {
   mach.outbuf += e.msg;
}
