"use strict"
"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.outputsignal name="O"/>
	<hh.localsignal name="L">
	  <hh.parallel>

	    <hh.loop>
	      <hh.emit signal="L"/>
	      <hh.pause/>
	    </hh.loop>

	    <hh.loop>
	      <hh.await immediate signal="L"/>
	      <hh.emit signal="O"/>
	      <hh.pause/>
	    </hh.loop>

	  </hh.parallel>
	</hh.localsignal>
      </hh.module>;

const machine = new hh.ReactiveMachine(prg, "sync2");

console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
