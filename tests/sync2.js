"use strict"
"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.outputsignal name="O"/>
	<hh.localsignal name="L">
	  <hh.parallel>

	    <hh.loop>
	      <hh.emit signal_name="L"/>
	      <hh.pause/>
	    </hh.loop>

	    <hh.loop>
	      <hh.await immediate signal_name="L"/>
	      <hh.emit signal_name="O"/>
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
