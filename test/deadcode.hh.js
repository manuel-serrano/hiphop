import * as hh from "@hop/hiphop";

hiphop module prg() {
   loop {
      fork {
	 yield;
      } par {
	 ;
      }
   }
   loop {
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.react({});
mach.react({});
mach.outbuf = "ok\n";
