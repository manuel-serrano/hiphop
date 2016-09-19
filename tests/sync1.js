"use strict"
"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module O>
	<hh.let L>
	  <hh.parallel>

	    <hh.loop>
	      <hh.emit L/>
	      <hh.pause/>
	    </hh.loop>

	    <hh.loop>
	      <hh.await L/>
	      <hh.emit O/>
	    </hh.loop>

	  </hh.parallel>
	</hh.let>
      </hh.module>;

const machine = new hh.ReactiveMachine(prg, "sync1");

console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
