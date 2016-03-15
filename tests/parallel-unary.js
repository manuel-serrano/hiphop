"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.localsignal name="L">
	  <hh.parallel>
	    <hh.emit signal_name="L"/>
	    <hh.parallel>
	      <hh.present signal_name="L">
		<hh.emit signal_name="O"/>
	      </hh.present>
	    </hh.parallel>
	  </hh.parallel>
	</hh.localsignal>
	<hh.pause/>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallelunary");
