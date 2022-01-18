"use @hop/hiphop"
"use hopscript"

import * as hh from "@hop/hiphop";

hiphop module prg() {
   out O;
   async (O) {
      setTimeout(() => this.notify(5), 3000);
   }
}

const machine = new hh.ReactiveMachine(prg, "exec");

machine.addEventListener("O", function(evt) {
   console.log("O emitted!");
});

machine.react();
