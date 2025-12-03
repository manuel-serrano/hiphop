import * as hh from "@hop/hiphop";

const prg = hiphop module prg() {
   loop {
      exit: {
	 fork {
	    pragma { mach.outbuf += ("S1a\n"); }
	    yield;
	 } par {
	    pragma { mach.outbuf += ("S2a\n"); }
            yield;
	    pragma { mach.outbuf += ("S2b\n"); }
	    break exit;
	 }
      }
   }
}


export const mach = new hh.ReactiveMachine(prg, { sweep: true, verbose: 1 });
mach.outbuf = "";
mach.react({});
mach.react({});
mach.react({});
mach.react({});
mach.react({});
