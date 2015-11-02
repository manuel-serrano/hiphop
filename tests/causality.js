var rjs = require("/home/colin/phd/reactive-js/xml-compiler.js");
var rk = require("/home/colin/phd/reactive-js/reactive-kernel.js");

var sigI = new rk.Signal("I");
var sigO = new rk.Signal("O");

var example = <rjs.reactivemachine name="presentemit">
  <rjs.outputsignal ref=${sigI}/>
  <rjs.outputsignal ref=${sigO}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.present signal_name="O">
	<rjs.emit signal_name="I"/>
      </rjs.present>
      <rjs.pause/>
      <rjs.emit signal_name="O"/>
    </rjs.sequence>
  </rjs.loop>
</rjs.reactivemachine>;

exports.prg = example;