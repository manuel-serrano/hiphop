import * as hh from "@hop/hiphop";

hiphop module sub() {
   inout S, U, W, Z;
   fork {
      if (S.now) emit W();
   } par {
      if (U.now) emit Z();
   }
}

hiphop module main() {
   in S; in U; inout A, B;
   run sub() { S, U, A as W, B as Z };
} 

export const mach = new hh.ReactiveMachine(main, "run2");
