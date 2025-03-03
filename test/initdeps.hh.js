import * as hh from "@hop/hiphop";

hiphop module prg() {
   inout B = 5, A = B.nowval;
   emit A();
   yield;
   {
      signal Y = B.nowval;
      signal X = Y.nowval;

      fork {
	 emit X();
      }

      emit A(X.nowval);
   }
}

export const mach = new hh.ReactiveMachine(prg);
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react()
mach.react()
