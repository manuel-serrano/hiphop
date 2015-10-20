var reactive = require("../reactive-kernel.js");
var rjs = require("../xml-compiler.js");
var inspector = require("../inspector.js");

var sigJ = new reactive.Signal("J", false);

var machine = <rjs.reactivemachine name="parallel">
  <rjs.outputsignal ref=${sigJ}/>
  <rjs.localsignal signal_name="I">
    <rjs.parallel>
      <rjs.emit signal_name="I"/>
      <rjs.sequence>
	<rjs.await signal_name="I"/>
	<rjs.emit signal_name="J"/>
      </rjs.sequence>
    </rjs.parallel>
  </rjs.localsignal>
</rjs.reactivemachine>;

exports.prg = machine;
