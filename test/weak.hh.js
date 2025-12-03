import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in S; out O, F, W;
   weakabort {
      loop {
	 emit O();
	 yield;
	 emit W();
      }
   } when  (S.now)
   emit F();
}

export const mach = new hh.ReactiveMachine(prg, "wabort");
