"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J"/>
  <hh.localsignal name="I">
    <hh.parallel>
      <hh.emit signal="I"/>
      <hh.sequence>
	<hh.await signal="I"/>
	<hh.emit signal="J"/>
      </hh.sequence>
    </hh.parallel>
  </hh.localsignal>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel");
