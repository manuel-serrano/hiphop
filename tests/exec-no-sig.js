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
	<hh.outputsignal name="OT"/>
	<hh.parallel>
	  <hh.sequence>
	    <hh.exec interface=${exec_interface}/>
	    <hh.emit signal="OT"/>
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

