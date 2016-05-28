"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.inputsignal name="in" combine_with=${(x, y) => x + y}/>
	<hh.emit signal_name="in" arg=5/>
	<hh.exec arg=${hh.value("in")}
		 interface=${{start: function(arg) {
		    console.log("receive " + arg);
		    this.return()
		 }}}/>
      </hh.module>

const machine = new hh.ReactiveMachine(prg, "");

console.log(machine.inputAndReact("in", 5));
console.log(machine.inputAndReact("in", 5));
console.log(machine.inputAndReact("in", 5));
