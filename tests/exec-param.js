"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module in=${{accessibility: hh.IN, combine: (x, y) => x + y}}>
	<hh.emit in value=${5}/>
	<hh.exec apply=${function() {
	   console.log("receive " + this.in.nowval);
	   this.notify( undefined, false );
	}}/>
      </hh.module>

const machine = new hh.ReactiveMachine(prg, "");
machine.debug_emitted_func = console.log

machine.inputAndReact("in", 5)
machine.inputAndReact("in", 5)
machine.inputAndReact("in", 5)
