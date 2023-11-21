"use @hop/hiphop";
"use hopscript";

hiphop module M1() {
   out a;
   emit a(100);
   async (a) {
      this.notify(10);
   }
}

hiphop mach m() {
   inout a, b;
   run M1() { b from a };
}

mach.outbuf = "";
mach.addEventListener("a", e => mach.outbuf += ("a=", e.nowval) + "\n");
mach.addEventListener("b", e => mach.outbuf += ("b=", e.nowval) + "\n");

mach.react();
mach.react();

export { mach }
