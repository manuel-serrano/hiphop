"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module I O>
	<hh.pause/>
	<hh.suspend I until=O>
	  <hh.loop>
	    <hh.atom apply=${function() {
	       console.log("ploup!"); }}/>
	    <hh.pause/>
	  </hh.loop>
	</hh.suspend>
      </hh.module>;

const m = new hh.ReactiveMachine(prg);

console.log(m.react());
console.log(m.react());
console.log("--");
console.log(m.inputAndReact("I"));
console.log(m.react());
console.log(m.react());
console.log(m.react());
console.log("--");
console.log(m.inputAndReact("O"));
console.log(m.react());
console.log(m.react());
console.log(m.react());
console.log("--");
console.log(m.inputAndReact("I"));
console.log(m.react());
