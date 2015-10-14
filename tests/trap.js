var rjs = require("../xml-compiler.js");
var reactive = require("../reactive-kernel.js");

var sigA = new reactive.Signal("A", false);
var sigB = new reactive.Signal("B", false);
var sigC = new reactive.Signal("C", false);
var tid = new reactive.TrapId("T");

var prg = <rjs.reactivemachine name="trap">
  <rjs.sequence>
    <rjs.emit signal=${sigA}/>
    <rjs.trap trapid=${tid}>
      <rjs.sequence>
	<rjs.exit trapid=${tid}/>
	<rjs.emit signal=${sigB}/>
      </rjs.sequence>
    </rjs.trap>
    <rjs.emit signal=${sigC}/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;

prg.react();
prg.react();
