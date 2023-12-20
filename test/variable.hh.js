import * as hh from "@hop/hiphop";

hiphop module prg() {
   in sig;
   let v = 1;

   every (sig.now) {
      if (sig.nowval > v) {
	 pragma { v = sig.nowval + 1 }
      }

      pragma { mach.outbuf += ("v= " + v) + "\n" }
      yield;
   }
}

export const mach = new hh.ReactiveMachine(prg, "variable");
mach.outbuf = "";

mach.react()
mach.inputAndReact("sig", 0);
mach.inputAndReact("sig", 10);
