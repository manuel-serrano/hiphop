import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout A, B, END1, END2;
   fork {
      emit A();
      await immediate(B.now);
      emit END1();
   } par {
      emit B();
      await immediate(B.now);
      emit END2();
   }
}

export const mach = new hh.ReactiveMachine(prg, "crossawait");
