import * as hh from "@hop/hiphop";

hiphop module prg() {
   in X; out Y, Z;
   await( X.now );

   every count( X.nowval + 5, true ) {
      emit Y();
   }
   emit Z();
}

export const mach = new hh.ReactiveMachine( prg );
mach.outbuf = "";
mach.debug_emitted_func = val => {
   mach.outbuf += (val.toString() ? "[ '" + val + "' ]\n" : "[]\n");
}

mach.react();
mach.react({X: 1});
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
mach.react();
