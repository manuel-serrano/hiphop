"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.trap name="foo">
	  <hh.nothing/>
	</hh.trap>
	<hh.trap name="foo">
	  <hh.nothing/>
	</hh.trap>
	<hh.trap name="bar">
	  <hh.trap name="bar">
	    <hh.nothing/>
	  </hh.trap>
	</hh.trap>
      </hh.module>;

try {
   var m = new hh.ReactiveMachine(prg);
} catch (e) {
   console.log(e.message);
}
