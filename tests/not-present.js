"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.inputsignal name="I"/>
	<hh.outputsignal name="O"/>
	<hh.loop>
	  <hh.present not signal_name="I">
	    <hh.emit signal_name="O"/>
	  </hh.present>
	  <hh.pause/>
	</hh.loop>
      </hh.module>

const machine = new hh.ReactiveMachine(prg, "not-present");

console.log(machine.react());
console.log(machine.inputAndReact("I"));
console.log(machine.react());
console.log(machine.react());
console.log(machine.inputAndReact("I"));
console.log(machine.inputAndReact("I"));
console.log(machine.inputAndReact("I"));
