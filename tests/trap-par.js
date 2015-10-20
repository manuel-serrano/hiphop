var rjs = require("../xml-compiler.js");
var reactive = require("../reactive-kernel.js");
require("../js2esterel.js");

var sigA = new reactive.Signal("A", false);
var sigB = new reactive.Signal("B", false);
var sigC = new reactive.Signal("C", false);

var prg = <rjs.reactivemachine name="trappar">
  <rjs.outputsignal ref=${sigA}/>
  <rjs.outputsignal ref=${sigB}/>
  <rjs.outputsignal ref=${sigC}/>
  <rjs.trap trap_name="T">
    <rjs.parallel>
      <rjs.sequence>
	<rjs.emit signal_name="A"/>
	<rjs.exit trap_name="T"/>
      </rjs.sequence>
      <rjs.sequence>
	<rjs.emit signal_name="B"/>
	<rjs.pause/>
	<rjs.emit signal_name="C"/>
      </rjs.sequence>
    </rjs.parallel>
  </rjs.trap>
</rjs.reactivemachine>;

exports.prg = prg
