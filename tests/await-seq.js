"use hopscript"

var rjs = require("../xml-compiler.js");

var sigA = new rjs.Signal("A");
var sigB = new rjs.Signal("B");
var sigO = new rjs.Signal("O");

var prg = <rjs.reactivemachine name="awaitseq">
  <rjs.inputsignal ref=${sigA}/>
  <rjs.inputsignal ref=${sigB}/>
  <rjs.outputsignal ref=${sigO}/>
  <rjs.sequence>
    <rjs.await signal_name="A"/>
    <rjs.await signal_name="B"/>
    <rjs.emit signal_name="O"/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
