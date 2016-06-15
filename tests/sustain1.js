"use hopscript"

const hh = require("hiphop");

const prg =
      <hh.module>
	<hh.inputsignal name="I"/>
	<hh.outputsignal name="J"/>
	<hh.outputsignal name="K"/>
	<hh.loop>
	  <hh.abort signal="I">
	    <hh.sustain signal="J"/>
	  </hh.abort>
	  <hh.emit signal="K"/>
	</hh.loop>
      </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "sustain1");
