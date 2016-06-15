"use hopscript"

var hh = require("hiphop");

var prg =
 <hh.module>
  <hh.outputsignal name="A"/>
  <hh.outputsignal name="B"/>
  <hh.outputsignal name="C"/>
  <hh.sequence>
    <hh.emit signal="A"/>
    <hh.trap name="T">
      <hh.sequence>
	<hh.exit trap="T"/>
	<hh.emit signal="B"/>
      </hh.sequence>
    </hh.trap>
    <hh.emit signal="C"/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trapsimple");
