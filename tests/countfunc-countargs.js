"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.inputsignal name="X" valued/>
	<hh.outputsignal name="Y"/>
	<hh.outputsignal name="Z"/>

	<hh.await signal="X"/>
	<hh.every func=${() => true}
		  argcount0=${hh.value("X")}
		  argcount1=213
		  funccount=${(x, y) => x + 5}>
	  <hh.emit signal="Y"/>
	</hh.every>
	<hh.emit signal="Z"/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);

console.log(m.react());
console.log(m.inputAndReact("X", 1));
console.log(m.react());
console.log(m.react());
console.log(m.react());
console.log(m.react());
console.log(m.react());
console.log(m.react());
console.log(m.react());
console.log(m.react());

