import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O1, O2;
   signal S;
   
   loop {
      if (S.pre) {
	 emit O1();
      } else {
	 emit O2();
      }
      yield;
      emit S();
   }
}

export const mach = new hh.ReactiveMachine(prg, "prepure2");
