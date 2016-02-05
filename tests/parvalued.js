"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="J" type="number"/>
  <hh.localsignal name="I" type="number">
    <hh.Parallel>
      <hh.present signal_name="I">
	<hh.emit signal_name="J" exprs=${hh.value("I")} />
      </hh.present>
      <hh.emit signal_name="I" exprs=5 />
    </hh.Parallel>
  </hh.localsignal>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "prevalued");
