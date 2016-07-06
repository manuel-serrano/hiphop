"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.trap name="t">
	  <hh.trap name="t">
	    <hh.exit trap="t"/>
	  </hh.trap>
	  <hh.atom func=${() => console.log("first level")}/>
	</hh.trap>
	<hh.atom func=${() => console.log("top level")}/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);

m.react();
