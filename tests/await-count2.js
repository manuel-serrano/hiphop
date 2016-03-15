"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.sequence>
	  <hh.await signal_name="I" args_count=3 />
	  <hh.emit signal_name="O" />
	</hh.sequence>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "await3");
