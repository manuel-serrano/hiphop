"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.every signal_name="I">
	<hh.emit signal_name="O"/>
      </hh.every>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "every1");
