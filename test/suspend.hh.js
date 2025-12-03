import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in I; out J, O;
   suspend {
      loop {
	 emit O();
	 yield;
      }
   } when (I.now)
   emit J();
}   

export const mach = new hh.ReactiveMachine(prg, "SUSPEND");
