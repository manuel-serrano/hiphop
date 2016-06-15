"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="A"/>
  <hh.outputsignal name="B"/>
  <hh.outputsignal name="C"/>
  <hh.trap name="T">
    <hh.parallel>
      <hh.sequence>
	<hh.emit signal="A"/>
	<hh.exit trap="T"/>
      </hh.sequence>
      <hh.sequence>
	<hh.emit signal="B"/>
	<hh.pause/>
	<hh.emit signal="C"/>
      </hh.sequence>
    </hh.parallel>
  </hh.trap>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trappar");
