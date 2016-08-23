"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.every immediate signal="I">
	<hh.emit signal="O"/>
      </hh.every>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "everyimmediate");
