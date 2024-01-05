import * as hh from "@hop/hiphop";

hiphop module prg() {
   in I; out O;
   do {
      emit O();
   } every(I.now)
}

export const mach = new hh.ReactiveMachine(prg, "loopeach");
