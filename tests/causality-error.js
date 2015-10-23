var rjs = require("/home/colin/phd/reactive-js/xml-compiler.js");
var rk = require("/home/colin/phd/reactive-js/reactive-kernel.js");

var sigI = new rk.Signal("I", false);
var sigO = new rk.Signal("O", false);

var example = <rjs.reactivemachine name="presentemit">
  <rjs.outputsignal ref=${sigI}/>
  <rjs.outputsignal ref=${sigO}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.present signal_name="O">
	<rjs.emit signal_name="I"/>
      </rjs.present>
      <rjs.emit signal_name="O"/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = example;
