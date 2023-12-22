import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in I; out J, O;
   suspend (I.now) {
      loop {
	 emit O();
	 yield;
      }
   }
   emit J();
}   

export const mach = new hh.ReactiveMachine(prg, "SUSPEND");
