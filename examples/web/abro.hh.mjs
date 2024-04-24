import { ReactiveMachine } from "@hop/hiphop";

const prg = hiphop module() {
   in A;
   in B;
   in R;
   out O = 0;
   
   do {
      fork {
         await (A.now);
      } par {
         await (B.now);
      }
      emit O(O.preval + 1);
   } every (R.now)
}

export const mach = new ReactiveMachine(prg);
