"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="A"/>
  <hh.outputsignal name="B"/>
  <hh.outputsignal name="C"/>
  <hh.outputsignal name="D"/>
  <hh.sequence>
    <hh.emit signal="A"/>
    <hh.trap name="U">
      <hh.sequence>
	<hh.trap name="T">
	  <hh.sequence>
	    <hh.exit trap="T"/>
	    <hh.emit signal="B"/>
	  </hh.sequence>
	</hh.trap>
	<hh.exit trap="U"/>
	<hh.emit signal="C"/>
      </hh.sequence>
    </hh.trap>
    <hh.emit signal="D"/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trapnested1");
