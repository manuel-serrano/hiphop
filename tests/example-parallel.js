"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J"/>
  <hh.localsignal name="I">
    <hh.parallel>
      <hh.emit signal_name="I"/>
      <hh.sequence>
	<hh.await signal_name="I"/>
	<hh.emit signal_name="J"/>
      </hh.sequence>
    </hh.parallel>
  </hh.localsignal>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel");
