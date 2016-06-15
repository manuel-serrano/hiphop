"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.every count=2 signal="I">
	<hh.emit signal="O"/>
      </hh.every>
    </hh.reactivemachine>;

exports.prg = new hh.ReactiveMachine(prg, "everydelay");
