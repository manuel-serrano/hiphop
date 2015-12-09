"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.reactivemachine debug name="await3">
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.sequence>
	  <hh.await signal_name="I" count=3 />
	  <hh.emit signal_name="O" />
	</hh.sequence>
      </hh.loop>
    </hh.reactivemachine>;

exports.prg = prg;
