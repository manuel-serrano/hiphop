"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module A B>
	<hh.trap EXIT>
	  <hh.parallel>

	    <hh.sequence>
	      <hh.await A/>
	      <hh.atom apply=${function() {console.log("A")}}/>
	      <hh.exit EXIT/>
	    </hh.sequence>

	    <hh.sequence>
	      <hh.await B/>
	      <hh.atom apply=${function() {console.log("B")}}/>
	      <hh.exit EXIT/>
	    </hh.sequence>

	  </hh.parallel>
	</hh.trap>
	<hh.atom apply=${function() {console.log("end")}}/>
      </hh.module>;

const m = new hh.ReactiveMachine(prg);

m.react();
m.inputAndReact("B");
