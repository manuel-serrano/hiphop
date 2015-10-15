var rjs = require("../xml-compiler.js");
var reactive = require("../reactive-kernel.js");
require("../js2esterel.js");

var sigA = new reactive.Signal("A", false);
var sigB = new reactive.Signal("B", false);
var sigC = new reactive.Signal("C", false);
var sigD = new reactive.Signal("D", false);
var tU = new reactive.TrapId("U");
var tT = new reactive.TrapId("T");

var prg = <rjs.reactivemachine name="trapnested2">
  <rjs.sequence>
    <rjs.emit signal=${sigA}/>
    <rjs.trap trapid=${tU}>
      <rjs.sequence>
	<rjs.trap trapid=${tT}>
	  <rjs.sequence>
	    <rjs.exit trapid=${tU}/>
	    <rjs.emit signal=${sigB}/>
	  </rjs.sequence>
	</rjs.trap>
	<rjs.emit signal=${sigC}/>
      </rjs.sequence>
    </rjs.trap>
    <rjs.emit signal=${sigD}/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
