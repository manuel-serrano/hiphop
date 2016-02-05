"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J"/>
  <hh.localsignal name="I">
    <hh.Parallel>
      <hh.present signal_name="I">
	<hh.emit signal_name="J"/>
      </hh.present>
      <hh.emit signal_name="I"/>
    </hh.Parallel>
  </hh.localsignal>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel2");
