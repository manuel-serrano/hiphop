"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigI = new rjs.Signal("I");
var sigO = new rjs.Signal("O");

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
