import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   every (I.now) {
      emit O();
   }
}

export const mach = new hh.ReactiveMachine(prg, "every1");
