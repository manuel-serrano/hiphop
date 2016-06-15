"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.outputsignal name="AUX"
			 init_value=1
			 reinit_func=${function() {return 1}}
			 combine_with=${function(a, b) { return (a * b) + 1}}/>
	<hh.outputsignal name="O"
			 reinit_func=${function() {return 2}}
			 combine_with=${function(a, b) {return a * b}}/>
	<hh.emit signal="O" arg=5/>
	<hh.emit signal="AUX" arg=245/>
	<hh.pause/>
	<hh.loop>
	  <hh.emit signal="O"
		   func=${function(a, b) { return a + b }}
		   arg0=1
		   arg1=${hh.preValue("O")}/>
	  <hh.emit signal="AUX"/>
	  <hh.pause/>
	</hh.loop>
      </hh.module>;

const machine = new hh.ReactiveMachine(prg, "reinit");

console.log(machine.react());
console.log(machine.react());
console.log(machine.react());
console.log(machine.react());


