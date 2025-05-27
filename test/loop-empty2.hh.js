import * as hh from "@hop/hiphop";

export let mach = undefined;

const prg = hiphop module() {
   // this program is equivalent to loop-empty.hh.js
   // it should not complain about instantaneous loop
   inout s1, s2;
   fork {
      yield;
      loop {
         fork {
            if (s1.now) {
               yield;
            } else {
               ;
            }
         } par {
            if (s2.now) {
               yield;
            } else {
               ;
            }
         }
	 pragma { mach.outbuf += "ok\n"; }
      }
   } par {
      loop {
         emit s1();
         yield;
         emit s2();
         yield;
      }
   }
}

mach = new hh.ReactiveMachine(prg, { verbose: -1 });
mach.outbuf = "";

try {
   mach.react({});
} catch(e) {
   mach = new hh.ReactiveMachine(hiphop module () {});
   mach.outbuf = e.message + "\n";
}
   
