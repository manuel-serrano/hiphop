"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J"/>
  <hh.let>
    <hh.signal name="I"/>
    <hh.parallel>
      <hh.emit signal="I"/>
      <hh.sequence>
	<hh.await signal="I"/>
	<hh.emit signal="J"/>
      </hh.sequence>
    </hh.parallel>
  </hh.let>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parallel");
