"use hopscript"

var hh = require("hiphop");

var prg =
    <hh.module>
      <hh.outputsignal name="A"/>
      <hh.outputsignal name="B"/>
      <hh.outputsignal name="END1"/>
      <hh.outputsignal name="END2"/>
      <hh.parallel>
	<hh.sequence>
	  <hh.emit signal_name="A"/>
	  <hh.await immediate signal_name="B"/>
	  <hh.emit signal_name="END1"/>
	</hh.sequence>
	<hh.sequence>
	  <hh.emit signal_name="B"/>
	  <hh.await immediate signal_name="A"/>
	  <hh.emit signal_name="END2"/>
	</hh.sequence>
      </hh.parallel>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "crossawait");
