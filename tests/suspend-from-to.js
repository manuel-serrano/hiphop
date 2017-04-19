"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module I O>
	<hh.pause/>
	<hh.suspend from=I to=O>
	  <hh.loop>
	    <hh.atom apply=${function() {
	       console.log("ploup!"); }}/>
	    <hh.pause/>
	  </hh.loop>
	</hh.suspend>
      </hh.module>;

const m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log

m.react()
m.react()
console.log("--");
m.inputAndReact("I")
m.react()
m.react()
m.react()
console.log("--");
m.inputAndReact("O")
m.react()
m.react()
m.react()
console.log("--");
m.inputAndReact("I")
m.react()
