import * as hh from "@hop/hiphop";

export let mach = undefined;

const prg = hiphop module() {
   loop {
      ;
   }
}

mach = new hh.ReactiveMachine(prg, { loopSafe: false, verbose: 0 });
mach.outbuf = "";

try {
   mach.react({});
   mach.react({});
   mach.react({});
} catch(e) {
   if (e.message === "Instantaneous loop detected") {
      mach.outbuf += "error dynamic.\n";
   } else if (e.message === "Causality error.") {
      mach.outbuf += "error dynamic.\n";
   } else if (e.message === "hiphop: causality error") {
      mach.outbuf += "error dynamic.\n";
   } else {
      mach.outbuf += e.message + "\n";
   }
}
   
try {
   new hh.ReactiveMachine(prg, { loopSafe: true });
} catch (e) {
   mach.outbuf += "error static.\n";
}
   
