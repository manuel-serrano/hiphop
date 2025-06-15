import * as hh from "@hop/hiphop";

export let mach = undefined;

const prg = hiphop module() {
   loop {
      if (false) {
	 ;
      } else {
	 yield;
      }
   }
}

mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";

try {
   mach.react({});
   mach.react({});
   mach.react({});
   mach.react({});
   mach.outbuf += "ok\n";
} catch(e) {
   mach = new hh.ReactiveMachine(hiphop module () {});
   mach.outbuf = e.message + "\n";
}
   
