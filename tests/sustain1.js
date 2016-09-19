"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module I=${{accessibility: hh.IN}} J K>
	<hh.loop>
	  <hh.abort I>
	    <hh.sustain J/>
	  </hh.abort>
	  <hh.emit K/>
	</hh.loop>
      </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "sustain1");
