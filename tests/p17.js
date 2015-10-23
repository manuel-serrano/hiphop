var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigO = new rk.Signal("O", false);

var prg = <rjs.reactivemachine name="P17">
  <rjs.outputsignal ref=${sigO}/>
  <rjs.loop>
    <rjs.localsignal signal_name="S1">
      <rjs.sequence>
	<rjs.present signal_name="S1">
	  <rjs.emit signal_name="O"/>
	</rjs.present>
	<rjs.pause/>
	<rjs.emit signal_name="S1"/>
      </rjs.sequence>
    </rjs.localsignal>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = prg;
