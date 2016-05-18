"use hopscript"

const hh = require("hiphop");

const exec_interface = {
   start: function() {
      console.log("Oi.");
      setTimeout(function(self) {
	 console.log("Oi timeout.");
	 self.return(5);
      }, 3000, this);
   }
}

const prg =
      <hh.module>
	<hh.outputsignal name="O"/>
	<hh.outputsignal name="OT" valued/>
	<hh.tasksignal name="T"/>
	<hh.parallel>
	  <hh.sequence>
	    <hh.exec signal_name="T" interface=${exec_interface}/>
	    <hh.emit signal_name="OT" arg=${hh.value("T")}/>
	  </hh.sequence>
	  <hh.emit signal_name="O"/>
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

