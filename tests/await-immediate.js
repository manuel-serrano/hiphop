"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.sequence>
	  <hh.await signal="I" immediate />
	  <hh.emit signal="O" />
	  <hh.pause/>
	</hh.sequence>
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "awaitimmediate");
