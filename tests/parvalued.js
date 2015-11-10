var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");
var inspector = require("../inspector.js");

var sigJ = new reactive.ValuedSignal("J", "number");

var machine = <rjs.ReactiveMachine name="parvalued">
  <rjs.outputsignal ref=${sigJ}/>
  <rjs.localsignal signal_name="I" type="number">
    <rjs.Parallel>
      <rjs.present signal_name="I">
	<rjs.emit signal_name="J"
		  expr=${<rjs.sigexpr signal_name="I"/>} />
      </rjs.present>
      <rjs.emit signal_name="I" expr=5 />
    </rjs.Parallel>
  </rjs.localsignal>
</rjs.ReactiveMachine>;

exports.prg = machine;
