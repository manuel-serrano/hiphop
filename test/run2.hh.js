import * as hh from "@hop/hiphop";

hiphop module m1() {
   inout T, W, V, Z;
   fork {
      if (T.now) {
	 signal L;
	 
	 emit L();
	 emit V();
      }
   } par {
      if (W.now) emit Z();
   }
}

hiphop module m2() {
   in S; in U; inout A, B;
   signal L;

   emit L();

   run m1() { S as T, U as W, A from V, B as Z };
   run m1() { S as T, U as W, A from V, B as Z };
}

export const mach = new hh.ReactiveMachine(m2, "run22");
