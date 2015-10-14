var rjs = require("../xml-compiler.js");
var reactive = require("../reactive-kernel.js");

var sigA = new reactive.Signal("A", false);
var sigB = new reactive.Signal("B", false);
var tid = new reactive.TrapId("T");

var prg = <rjs.reactivemachine name="trap1">
  <rjs.sequence>
    <rjs.emit signal=${sigA}/>
    <rjs.trap trapid=${tid}>
      <rjs.sequence>
	<rjs.exit trapid=${tid}/>
	<rjs.emit signal=${sigB}/>
      </rjs.sequence>
    </rjs.trap>
    </rjs.sequence>
</rjs.reactivemachine>;

prg.react();
prg.react();
