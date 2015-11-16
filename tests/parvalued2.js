"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigJ = new rjs.ValuedSignal("J", "number");

var machine = <rjs.ReactiveMachine debug name="parvalued2">
  <rjs.outputsignal ref=${sigJ}/>
  <rjs.localsignal signal_name="I" type="number">
    <rjs.Parallel>
      <rjs.emit signal_name="I" expr=5 />
      <rjs.present signal_name="I">
	<rjs.emit signal_name="J"
		  expr=${<rjs.sigexpr get_value signal_name="I"/>} />
      </rjs.present>
    </rjs.Parallel>
  </rjs.localsignal>
</rjs.ReactiveMachine>;

exports.prg = machine;
