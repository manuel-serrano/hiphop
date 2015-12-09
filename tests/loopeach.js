"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.reactivemachine debug name="loopeach">
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.loopeach signal_name="I">
	<hh.emit signal_name="O"/>
      </hh.loopeach>
    </hh.reactivemachine>;

exports.prg = prg;
