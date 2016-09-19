"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.trap t>
	  <hh.trap t>
	    <hh.exit t/>
	  </hh.trap>
	  <hh.atom apply=${() => console.log("first level")}/>
	</hh.trap>
	<hh.atom apply=${() => console.log("top level")}/>
      </hh.module>;

var m = new hh.ReactiveMachine(prg);

m.react();
