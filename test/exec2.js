"use hopscript"

import * as hh from "@hop/hiphop";

const prg =
      <hh.module O>
	<hh.exec O apply=${function() {
	   setTimeout(() => this.notify(5), 3000);
	}}/>
      </hh.module>

const machine = new hh.ReactiveMachine(prg, "exec");

machine.addEventListener("O", function(evt) {
   console.log("O emitted!");
});

machine.react();
