"use hopscript"

/* check if semantics of suspends / resume is correct when a task is over */

const hh = require("hiphop");

var glob = 5;

const prg =
      <hh.module>

	<hh.inputsignal name="RES"/>
	<hh.inputsignal name="S"/>
	<hh.outputsignal name="O"/>
	<hh.outputsignal name="OT" valued/>
	<hh.inputsignal name="T" valued/>
	<hh.parallel>
	  <hh.suspend signal="S">
	    <hh.exec signal="T"
		     start=${function() {
			console.log("Oi.");
			setTimeout(function(self) {
			   console.log("Oi timeout.");
			   self.return(glob++);
			}, 1000, this);
		     }}
		     susp=${function() {console.log("suspended.");}}
		     res=${function() {console.log("resumed.");}}/>
	    <hh.emit signal="OT" arg=${hh.value("T")}/>
	  </hh.suspend>
	  <hh.emit signal="O"/>
	</hh.parallel>
	<hh.await signal="RES"/>
	<hh.emit signal="OT" arg=${hh.value("T")}/>
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
   console.log(machine.inputAndReact("RES"));
   console.log(machine.inputAndReact("S"));
   console.log(machine.react());
}, 2000);
