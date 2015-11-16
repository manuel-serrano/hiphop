var rjs = require("../lib/reactive-js.js");

var sigI = new rjs.Signal("I");
var sigO = new rjs.Signal("O");

var prg = <rjs.reactivemachine name="abortpar">
  <rjs.inputsignal ref=${sigI}/>
  <rjs.outputsignal ref=${sigO}/>
  <rjs.localsignal signal_name="L">
    <rjs.parallel>
      <rjs.abort signal_name="L">
	<rjs.loop>
	  <rjs.sequence>
	    <rjs.emit signal_name="O"/>
	    <rjs.pause/>
	  </rjs.requence>
	</rjs.loop>
      </rjs.abort>
      <rjs.sequence>
	<rjs.await signal_name="I"/>
	<rjs.emit signal_name="L"/>
      </rjs.sequence>
    </rjs.parallel>
  </rjs.localsignal>
</rjs.reactivemachine>;

exports.prg = prg;
