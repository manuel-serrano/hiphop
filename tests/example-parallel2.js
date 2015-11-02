var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");
var inspector = require("../inspector.js");

var sigJ = new reactive.Signal("J");

var machine = <rjs.ReactiveMachine name="parallel2">
  <rjs.outputsignal ref=${sigJ}/>
  <rjs.localsignal signal_name="I">
    <rjs.Parallel>
      <rjs.present signal_name="I">
	<rjs.emit signal_name="J"/>
      </rjs.present>
      <rjs.emit signal_name="I"/>
    </rjs.Parallel>
  </rjs.localsignal>
</rjs.ReactiveMachine>;

exports.prg = machine;
