"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J"/>
  <hh.localsignal name="I">
    <hh.Parallel>
      <hh.present signal="I">
	<hh.emit signal="J"/>
      </hh.present>
      <hh.emit signal="I"/>
    </hh.Parallel>
  </hh.localsignal>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel2");
