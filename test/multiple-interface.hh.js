import * as hh from "@hop/hiphop";

hiphop interface I1 { inout A, B, C; };
hiphop interface I2 extends I1 { inout D; };

hiphop module M2() implements I2 {
   emit A(10);
   emit D(23);
}

hiphop module M1() implements I1, I2 {
   inout Z;
   run M2() { Z as D, * }
}

export const mach = new hh.ReactiveMachine(M1);
mach.outbuf = "";

mach.addEventListener("A", v => mach.outbuf += ("got A " + v.signalValue) + "\n");
mach.addEventListener("Z", v => mach.outbuf += ("got Z " + v.signalValue) + "\n");

mach.react();
