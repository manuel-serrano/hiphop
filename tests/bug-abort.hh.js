"use @hop/hiphop"
"use hopscript"

import { ReactiveMachine } from "@hop/hiphop";

hiphop module prg() {
   in A;
   out B, C;

   abort (A.now) {
      ;
   }
   emit C(123);
}

const m = new ReactiveMachine(prg,{ dumpNets: true });
m.addEventListener("C", e => console.log("got C: ", e.nowval));
m.addEventListener("B", e => console.log("got B: ", e.nowval));
console.log("1");
m.react({});
console.log("2");
m.react({A:111});
console.log("3");
