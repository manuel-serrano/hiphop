"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.localsignal name="L">
	  <hh.parallel>
	    <hh.emit signal="L"/>
	    <hh.parallel>
	      <hh.present signal="L">
		<hh.emit signal="O"/>
	      </hh.present>
	    </hh.parallel>
	  </hh.parallel>
	</hh.localsignal>
	<hh.pause/>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallelunary");
