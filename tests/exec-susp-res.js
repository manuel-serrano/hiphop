"use hopscript"

/* check if semantics of suspends / resume is correct when a task is over */

const hh = require("hiphop");

var glob = 5;

const prg =
      <hh.module RESS=${{accessibility: hh.IN}} S=${{accessibility: hh.IN}} O OT
		 T=${{accessibility: hh.IN}}>
	<hh.parallel>
	  <hh.suspend S>
	    <hh.exec T apply=${function() {
	       console.log("Oi.");
	       setTimeout(function(self) {
		  console.log("Oi timeout.");
		  self.notify(glob++, false);
	       }, 1000, this);
	    }}
	      suspApply=${function() {console.log("suspended.");}}
	      resApply=${function() {console.log("resumed.");}}/>
	    <hh.emit OT apply=${function() {return this.T.nowval}}/>
	  </hh.suspend>
	  <hh.emit O/>
	</hh.parallel>
	<hh.await RESS />
	<hh.emit OT apply=${function() {return this.T.nowval}}/>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");
machine.debug_emitted_func = console.log;

machine.react()
machine.inputAndReact("S")
machine.inputAndReact("S")
machine.inputAndReact("S")
machine.inputAndReact("S")
machine.react()
machine.react()
machine.inputAndReact("S")

setTimeout(function() {
   machine.react()
   machine.inputAndReact("RESS")
   machine.inputAndReact("S")
   machine.react()
}, 2000);
