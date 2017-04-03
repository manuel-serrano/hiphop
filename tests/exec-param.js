"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module in=${{accessibility: hh.IN, combine: (x, y) => x + y}}>
	<hh.emit in value=${5}/>
	<hh.exec apply=${function() {
	   console.log("receive " + this.value.in);
	   this.notify();
	}}/>
      </hh.module>

const machine = new hh.ReactiveMachine(prg, "");

console.log(machine.inputAndReact("in", 5));
console.log(machine.inputAndReact("in", 5));
console.log(machine.inputAndReact("in", 5));
