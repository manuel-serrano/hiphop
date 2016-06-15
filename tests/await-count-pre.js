"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.sequence>
	  <hh.await signal="I" count=3 test_pre />
	  <hh.emit signal="O" />
	</hh.sequence>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "await3");
