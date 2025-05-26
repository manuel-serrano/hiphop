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
} catch(e) {
   mach = new hh.ReactiveMachine(hiphop module () {});
   mach.outbuf = e.message + "\n";
}
   
