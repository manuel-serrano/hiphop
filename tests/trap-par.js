"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="A"/>
  <hh.outputsignal name="B"/>
  <hh.outputsignal name="C"/>
  <hh.trap trap_name="T">
    <hh.parallel>
      <hh.sequence>
	<hh.emit signal_name="A"/>
	<hh.exit trap_name="T"/>
      </hh.sequence>
      <hh.sequence>
	<hh.emit signal_name="B"/>
	<hh.pause/>
	<hh.emit signal_name="C"/>
      </hh.sequence>
    </hh.parallel>
  </hh.trap>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "trappar");
