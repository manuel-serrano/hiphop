"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module X=${{accessibility: hh.IN}} Y Z>

	<hh.await X/>
	<hh.every apply=${() => true}
		  countApply=${function() {
		     return this.X.nowval + 5
		  }}>
	  <hh.emit Y/>
	</hh.every>
	<hh.emit Z/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);
m.debug_emitted_func = console.log

m.react()
m.inputAndReact("X", 1)
m.react()
m.react()
m.react()
m.react()
m.react()
m.react()
m.react()
m.react()
