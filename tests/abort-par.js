var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");
require("../js2esterel.js");

var sigI = new rk.Signal("I", false, null);
var sigL = new rk.Signal("L", false, function() {});
sigL.local = true;
var sigO = new rk.Signal("O", false, function () {
   console.log("EMIT O");
});

var prg = <rjs.reactivemachine name="abort-par">
    <rjs.parallel>
      <rjs.abort signal=${sigL}>
	<rjs.loop>
	  <rjs.sequence>
	    <rjs.emit signal=${sigO}/>
	    <rjs.pause/>
	  </rjs.requence>
	</rjs.loop>
      </rjs.abort>
      <rjs.sequence>
	<rjs.await signal=${sigI}/>
	<rjs.emit signal=${sigL}/>
      </rjs.sequence>
    </rjs.parallel>
</rjs.reactivemachine>;

console.log(prg.esterel_code());

prg.react();
prg.react();
sigI.set_from_host(true, null);
prg.react();
prg.react();
