"use strict"
"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module O>
	<hh.local L>
	  <hh.parallel>

	    <hh.loop>
	      <hh.emit L/>
	      <hh.pause/>
	    </hh.loop>

	    <hh.loop>
	      <hh.await immediate L/>
	      <hh.emit O/>
	    </hh.loop>

	  </hh.parallel>
	</hh.local>
      </hh.module>;

const machine = new hh.ReactiveMachine(prg, "sync-err");

try {
   console.log(machine.react());
   console.log(machine.react());
   console.log(machine.react());
   console.log(machine.react());
} catch (e) {
   console.log(e.message);
}
