var rjs = require("../xml-compiler.js");
var reactive = require("../reactive-kernel.js");
require("../js2esterel.js");

var sigA = new reactive.Signal("A", false);
var sigB = new reactive.Signal("B", false);
var sigC = new reactive.Signal("C", false);
var tid = new reactive.TrapId("T");

var prg = <rjs.reactivemachine name="trappar">
  <rjs.trap trapid=${tid}>
    <rjs.parallel>
      <rjs.sequence>
	<rjs.emit signal=${sigA}/>
	<rjs.exit trapid=${tid}/>
      </rjs.sequence>
      <rjs.sequence>
	<rjs.emit signal=${sigB}/>
	<rjs.pause/>
	<rjs.emit signal=${sigC}/>
      </rjs.sequence>
    </rjs.parallel>
  </rjs.trap>
</rjs.reactivemachine>;

exports.prg = prg
