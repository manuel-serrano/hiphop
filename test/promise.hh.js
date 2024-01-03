import * as hh from "@hop/hiphop";

hiphop module prg() {
   out res, rej;
   emit res("resolved");
}

export const mach = new hh.ReactiveMachine(prg, "promise");
mach.outbuf = "";

mach.batchPromise = mach.promise().then(v => mach.outbuf += mach.name() + " " + v + "\n");
mach.react();
