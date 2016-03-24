"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J" valued/>
  <hh.localsignal name="I" valued>
    <hh.Parallel>
      <hh.present signal_name="I">
	<hh.emit signal_name="J" arg=${hh.value("I")} />
      </hh.present>
      <hh.emit signal_name="I" arg=5 />
    </hh.Parallel>
  </hh.localsignal>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "parvalued");
