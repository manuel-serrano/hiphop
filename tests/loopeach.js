"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.loopeach signal="I">
	<hh.emit signal="O"/>
      </hh.loopeach>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "loopeach");
