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
		  self.return(5);
	       }, 3000, this);
	    }}/>
	    <hh.emit OT apply=${function() {return this.value.T}}/>
	  </hh.sequence>
	  <hh.emit O/>
	</hh.parallel>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");

console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
console.log(".......");
setTimeout(function() {
   console.log(machine.react());
   console.log(machine.react());
}, 5000);

