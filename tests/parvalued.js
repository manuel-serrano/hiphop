"use hopscript"

var rjs = require("reactive-js");

var machine = <rjs.ReactiveMachine debug name="parvalued">
  <rjs.outputsignal name="J" type="number"/>
  <rjs.localsignal signal_name="I" type="number">
    <rjs.Parallel>
      <rjs.present signal_name="I">
	<rjs.emit signal_name="J"
		  expr=${<rjs.sigexpr get_value signal_name="I"/>} />
      </rjs.present>
      <rjs.emit signal_name="I" expr=5 />
    </rjs.Parallel>
  </rjs.localsignal>
</rjs.ReactiveMachine>;

exports.prg = machine;
