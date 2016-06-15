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
	  <hh.emit signal="A"/>
	  <hh.await immediate signal="B"/>
	  <hh.emit signal="END1"/>
	</hh.sequence>
	<hh.sequence>
	  <hh.emit signal="B"/>
	  <hh.await immediate signal="A"/>
	  <hh.emit signal="END2"/>
	</hh.sequence>
      </hh.parallel>
    </hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "crossawait");
