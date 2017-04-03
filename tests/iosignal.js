"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module I=${{accessibility: hh.IN}} X Y>
	<hh.emit Y/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log

m.inputAndReact("I")
m.inputAndReact("X", 15)
m.react()
m.inputAndReact("Y")
