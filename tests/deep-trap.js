"use hopscript"

import * as hh from "@hop/hiphop";

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

const m = new hh.ReactiveMachine(prg);

m.react();
