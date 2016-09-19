"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module A B>
	<hh.loop>
	  <hh.emit A ifApply=${function(){return this.present.B}}/>
	  <hh.pause/>
	</hh.loop>
      </hh.module>

const m = new hh.ReactiveMachine(prg);

console.log(m.react());
console.log(m.react());
console.log(m.inputAndReact("B"));
console.log(m.react());
console.log(m.inputAndReact("B"));
console.log(m.inputAndReact("B"));

