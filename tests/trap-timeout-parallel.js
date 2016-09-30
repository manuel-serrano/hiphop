"use hopscript"

const hh = require("hiphop");
const tl = hh.timelib;

const prg =
      <hh.module>
	<hh.trap EXIT>
	  <hh.parallel>

	    <hh.sequence>
	      <tl.timeout value=${200}/>
	      <hh.atom apply=${function() {console.log("tick branch 1")}}/>
	      <hh.exit EXIT/>
	    </hh.sequence>

	    <hh.sequence>
	      <tl.timeout value=${50}/>
	      <hh.atom apply=${function() {console.log("tick branch 2")}}/>
	      <hh.exit EXIT/>
	    </hh.sequence>

	  </hh.parallel>
	</hh.trap>
	<hh.atom apply=${function() {console.log("end")}}/>
      </hh.module>;

const m = new hh.ReactiveMachine(prg);

m.react();
