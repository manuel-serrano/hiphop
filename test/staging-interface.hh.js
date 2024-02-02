import * as hh from "@hop/hiphop";

const I1 = {
   A: { direction: "INOUT", transient: true },
   B: { direction: "INOUT", transient: true },
   C: { direction: "INOUT", transient: true }
}

const I2 = Object.assign({D: { direction: "INOUT" }}, I1);

const bindings = {
   D: "Z",
   "*": true
};

hiphop module M2() implements I2 {
   emit A(10);
   emit D(23);
}

hiphop module M1() implements I1 {
   inout Z;
   run M2() ${bindings}
}

export const mach = new hh.ReactiveMachine(M1);
mach.outbuf = "";

mach.addEventListener("A", v => mach.outbuf += ("got A " + v.nowval) + "\n");
mach.addEventListener("Z", v => mach.outbuf += ("got Z " + v.nowval) + "\n");

mach.react();
