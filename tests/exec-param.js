"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.inputsignal name="in" combine=${(x, y) => x + y}/>
	<hh.emit signal="in" arg=5/>
	<hh.exec start=${function() {
	   console.log("receive " + this.value.in);
	   this.return();
	}}/>
      </hh.module>

const machine = new hh.ReactiveMachine(prg, "");

console.log(machine.inputAndReact("in", 5));
console.log(machine.inputAndReact("in", 5));
console.log(machine.inputAndReact("in", 5));
