import * as hh from "@hop/hiphop";

export let mach = undefined;

const prg = hiphop module() {
   loop {
      ;
   }
}

mach = new hh.ReactiveMachine(prg);

try {
   mach.react({});
   mach.react({});
   mach.react({});
} catch(e) {
   mach = new hh.ReactiveMachine(hiphop module () {});
   if (e.message === "Instantaneous loop detected") {
      mach.outbuf = "Instantaneous loop.\n";
   } else {
      mach.outbuf = e.message + "\n";
   }
}
   
