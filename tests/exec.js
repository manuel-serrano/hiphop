"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module T=${{accessibility: hh.IN}} O OT>
	<hh.parallel>
	  <hh.sequence>
	    <hh.exec T apply=${function() {
	       console.log("Oi.");
	       setTimeout(function(self) {
		  console.log("Oi timeout.");
		  self.notify(5, false);
	       }, 3000, this);
	    }}/>
	    <hh.emit OT apply=${function() {return this.T.nowval}}/>
	  </hh.sequence>
	  <hh.emit O/>
	</hh.parallel>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");
machine.debug_emitted_func = console.log

machine.react()
machine.react()
machine.react()
console.log(".......");
setTimeout(function() {
   machine.react()
   machine.react()
}, 5000);

