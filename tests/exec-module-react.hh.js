"use @hop/hiphop";
"use hopscript";

hiphop module M1() {
   out a;
   emit a(100);
   async (a) {
      this.notify(10);
   }
}

hiphop machine m() {
   inout a, b;
   run M1() { b from a };
}

m.addEventListener("a", e => console.log("a=", e.nowval));
m.addEventListener("b", e => console.log("b=", e.nowval));

m.react();
m.react();
