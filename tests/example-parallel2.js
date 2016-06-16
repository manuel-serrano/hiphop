"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J"/>
  <hh.let>
    <hh.signal name="I"/>
    <hh.Parallel>
      <hh.present signal="I">
	<hh.emit signal="J"/>
      </hh.present>
      <hh.emit signal="I"/>
    </hh.Parallel>
  </hh.let>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel2");
