import * as hh from "@hop/hiphop";

hiphop module prg() {
   out res;
   emit res("machine promise resolved");
}

const mach = new hh.ReactiveMachine(prg, "promise");
mach.outbuf = "";

mach.batchPromise = mach.promise().then(v => mach.outbuf += "v");
mach.react();
