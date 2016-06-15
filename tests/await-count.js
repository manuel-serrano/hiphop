"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.await signal="I" count=3 />
	<hh.emit signal="O" />
      </hh.loop>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "await3");

