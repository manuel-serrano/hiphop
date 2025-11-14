import * as hh from "@hop/hiphop";

function consoleLog(...args) {
   mach.outbuf += args.join("").toString() + "\n";
}

hiphop module prg(resolve) {
   inout X = 1;
   signal __internal = -1;

   if (__internal.preval === -1) {
      pragma { consoleLog("__internal X=" + X.nowval); }
   }

}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

consoleLog("--------------- ", mach.age());
mach.react();
consoleLog("--------------- ", mach.age());

 
