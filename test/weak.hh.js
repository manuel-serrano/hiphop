import * as hh from "@hop/hiphop";

const prg = hiphop module() {
   in S; out O, F, W;
   weakabort (S.now) {
      loop {
	 emit O();
	 yield;
	 emit W();
      }
   }
   emit F();
}

export const mach = new hh.ReactiveMachine(prg, "wabort");
