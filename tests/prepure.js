"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="O1"/>
  <hh.outputsignal name="O2"/>
  <hh.loop>
    <hh.localsignal name="S">
      <hh.present test_pre signal_name="S">
	<hh.emit signal_name="O1"/>
	<hh.emit signal_name="O2"/>
      </hh.present>
      <hh.pause/>
      <hh.emit signal_name="S"/>
    </hh.localsignal>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "prepure");
