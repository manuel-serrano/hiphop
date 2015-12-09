"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.reactivemachine debug name="awaitimmediate">
      <hh.inputsignal name="I"/>
      <hh.outputsignal name="O"/>
      <hh.loop>
	<hh.sequence>
	  <hh.await signal_name="I" immediate />
	  <hh.emit signal_name="O" />
	  <hh.pause/>
	</hh.sequence>
      </hh.loop>
    </hh.reactivemachine>;

exports.prg = prg;
