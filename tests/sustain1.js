"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="J"/>
      <hh.outputsignal name="K"/>
      <hh.loop>
	<hh.sequence>
	  <hh.abort signal_name="I">
	    <hh.sustain signal_name="J"/>
	  </hh.abort>
	  <hh.emit signal_name="K"/>
	</hh.sequence>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "sustain1");
