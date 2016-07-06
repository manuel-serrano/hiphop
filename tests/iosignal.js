"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.inputsignal name="I"/>
	<hh.iosignal name="X" valued/>
	<hh.iosignal name="Y"/>
	<hh.emit signal="Y"/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);

console.log(m.inputAndReact("I"));
console.log(m.inputAndReact("X", 15));
console.log(m.react());
console.log(m.inputAndReact("Y"));
