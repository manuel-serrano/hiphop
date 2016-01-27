"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="A"/>
  <hh.outputsignal name="B"/>
  <hh.outputsignal name="C"/>
  <hh.outputsignal name="D"/>
  <hh.sequence>
    <hh.emit signal_name="A"/>
    <hh.trap trap_name="U">
      <hh.sequence>
	<hh.trap trap_name="T">
	  <hh.sequence>
	    <hh.exit trap_name="T"/>
	    <hh.emit signal_name="B"/>
	  </hh.sequence>
	</hh.trap>
	<hh.exit trap_name="U"/>
	<hh.emit signal_name="C"/>
      </hh.sequence>
    </hh.trap>
    <hh.emit signal_name="D"/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trapnested1");
