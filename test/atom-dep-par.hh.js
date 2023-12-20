import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A combine (x, y) => x + y;
   
   fork {
      loop {
	 emit A(0);
	 yield;
      }
   } par {
      loop {
	 emit A(1);
	 pragma { mach.outbuf += A.nowval + "\n"; }
	 yield;
      }
   } par {
      loop {
	 emit A(2);
	 pragma { mach.outbuf += A.nowval + "\n"; }
	 yield;
      }
   }
}

export const mach = new hh.ReactiveMachine(prg, "error2");

mach.outbuf = "";
mach.debug_emitted_func = val => mach.outbuf += "[ '" + val + "' ]\n";

mach.react()
mach.react()
mach.react()
mach.react()
mach.react()
