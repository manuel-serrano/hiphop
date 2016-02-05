"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.every count=2 signal_name="I">
	<hh.emit signal_name="O"/>
      </hh.every>
    </hh.reactivemachine>;

exports.prg = new hh.ReactiveMachine(prg, "everydelay");
