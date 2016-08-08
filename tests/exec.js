"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.outputsignal name="O"/>
	<hh.outputsignal name="OT" valued/>
	<hh.inputsignal name="T" valued/>
	<hh.parallel>
	  <hh.sequence>
	    <hh.exec signal="T" start=${function() {
	       console.log("Oi.");
	       setTimeout(function(self) {
		  console.log("Oi timeout.");
		  self.return(5);
	       }, 3000, this);
	    }}/>
	    <hh.emit signal="OT" arg=${hh.value("T")}/>
	  </hh.sequence>
	  <hh.emit signal="O"/>
	</hh.parallel>
      </hh.module>

var machine = new hh.ReactiveMachine(prg, "exec");

console.log(machine.ast.pretty_print());
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
console.log(".......");
setTimeout(function() {
   console.log(machine.react());
   console.log(machine.react());
}, 5000);

