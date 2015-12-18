"use hopscript"

var rjs = require("hiphop");

var machine = <rjs.ReactiveMachine debug name="parvalued2">
  <rjs.outputsignal name="J" type="number"/>
  <rjs.localsignal name="I" type="number">
    <rjs.Parallel>
      <rjs.emit signal_name="I" exprs=5 />
      <rjs.present signal_name="I">
	<rjs.emit signal_name="J" exprs=${rjs.value("I")} />
      </rjs.present>
    </rjs.Parallel>
  </rjs.localsignal>
</rjs.ReactiveMachine>;

exports.prg = machine;
