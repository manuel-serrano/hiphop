"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module O OT>
	<hh.parallel>
	  <hh.sequence>
	    <hh.exec apply=${function() {
	       console.log("Oi.");
	       setTimeout(() => {
		  console.log("Oi timeout.");
		  this.notify(5, false);
	       }, 3000);
	    }}/>
	    <hh.emit OT/>
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

