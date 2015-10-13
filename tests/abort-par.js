var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");
var batch = require("../batch-interpreter.js");

var sigI = new rk.Signal("I", false);
var sigL = new rk.Signal("L", false);
sigL.local = true;
var sigO = new rk.Signal("O", false);

var prg = <rjs.reactivemachine name="abortpar">
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

exports.prg = prg;
batch.interpreter(prg);
