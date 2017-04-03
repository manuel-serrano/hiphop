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
		  self.notify(glob++);
	       }, 1000, this);
	    }}
	      susp=${function() {console.log("suspended.");}}
	      res=${function() {console.log("resumed.");}}/>
	    <hh.emit OT apply=${function() {return this.value.T}}/>
	  </hh.suspend>
	  <hh.emit O/>
	</hh.parallel>
	<hh.await RESS />
	<hh.emit OT apply=${function() {return this.value.T}}/>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");

console.log(machine.react());
console.log(machine.inputAndReact("S"));
console.log(machine.inputAndReact("S"));
console.log(machine.inputAndReact("S"));
console.log(machine.inputAndReact("S"));
console.log(machine.react());
console.log(machine.react());
console.log(machine.inputAndReact("S"));

setTimeout(function() {
   console.log(machine.react());
   console.log(machine.inputAndReact("RESS"));
   console.log(machine.inputAndReact("S"));
   console.log(machine.react());
}, 2000);
