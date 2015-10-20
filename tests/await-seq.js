"use hopscript"

var rjs = require("../xml-compiler.js");
var rkernel = require("../reactive-kernel.js");
var inspector = require("../inspector.js");

var sigA = new rkernel.Signal("A", false);
var sigB = new rkernel.Signal("B", false);
var sigO = new rkernel.Signal("O", false);

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
