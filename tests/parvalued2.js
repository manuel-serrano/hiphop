"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J" valued/>
  <hh.let>
    <hh.signal name="I" valued/>
    <hh.Parallel>
      <hh.emit signal="I" arg=5 />
      <hh.present signal="I">
	<hh.emit signal="J" arg=${hh.value("I")} />
      </hh.present>
    </hh.Parallel>
  </hh.let>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parvalued2");
