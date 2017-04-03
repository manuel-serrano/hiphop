"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module O>
      <hh.loop>
	<hh.local L>
	  <hh.parallel>
	    <hh.emit L/>
	    <hh.parallel>
	      <hh.if L>
		<hh.emit O/>
	      </hh.if>
	    </hh.parallel>
	  </hh.parallel>
	</hh.local>
	<hh.pause/>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallelunary");
