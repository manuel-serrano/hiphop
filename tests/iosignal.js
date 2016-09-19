"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module I=${{accessibility: hh.IN}} X Y>
	<hh.emit Y/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);

console.log(m.inputAndReact("I"));
console.log(m.inputAndReact("X", 15));
console.log(m.react());
console.log(m.inputAndReact("Y"));
