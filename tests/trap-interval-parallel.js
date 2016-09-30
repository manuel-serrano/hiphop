"use hopscript"

const hh = require("hiphop");
const tl = hh.timelib;

const prg =
      <hh.module>
	<hh.trap EXIT>
	  <hh.parallel>

	    <hh.sequence>
	      <tl.interval countValue=${5} value=${10}>
		<hh.atom apply=${function() {console.log("tick branch 1")}}/>
	      </tl.interval>
	      <hh.exit EXIT/>
	    </hh.sequence>

	    <hh.sequence>
	      <tl.interval countValue=${2} value=${10}>
		<hh.atom apply=${function() {console.log("tick branch 2")}}/>
	      </tl.interval>
	      <hh.exit EXIT/>
	    </hh.sequence>

	  </hh.parallel>
	</hh.trap>
	<hh.atom apply=${function() {console.log("end")}}/>
      </hh.module>;

const m = new hh.ReactiveMachine(prg);

m.react();
m.react();
m.react();
