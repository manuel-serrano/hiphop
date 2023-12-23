import * as hh from "@hop/hiphop";

hiphop module prg() {
   out tick;
   signal cnt = 5;
   
   exit: loop {
      emit tick("loop" + cnt.preval);
      emit cnt(cnt.preval - 1);
      
      yield;

      if (cnt.preval === 0) {
	 break exit;
      }
   }
   emit tick("done");
}
   
export const mach = new hh.ReactiveMachine(prg, "TRAP-LOOP");
