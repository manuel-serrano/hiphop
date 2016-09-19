"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module X=${{accessibility: hh.IN}} Y Z>

	<hh.await X/>
	<hh.every apply=${() => true}
		  countApply=${function() {
		     return this.value.X + 5
		  }}>
	  <hh.emit Y/>
	</hh.every>
	<hh.emit Z/>
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

