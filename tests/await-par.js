"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigA = new rjs.Signal("A");
var sigB = new rjs.Signal("B");
var sigO = new rjs.Signal("O");

var prg = <rjs.reactivemachine debug name="awaitpar">
  <rjs.inputsignal ref=${sigA}/>
  <rjs.inputsignal ref=${sigB}/>
  <rjs.outputsignal ref=${sigO}/>
  <rjs.sequence>
    <rjs.parallel>
      <rjs.await signal_name="A"/>
      <rjs.await signal_name="B"/>
    </rjs.parallel>
    <rjs.emit signal_name="O"/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
