"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="awaitseq">
  <rjs.inputsignal name="A"/>
  <rjs.inputsignal name="B"/>
  <rjs.outputsignal name="O"/>
  <rjs.await signal_name="A"/>
  <rjs.inputsignal name="C"/>
  <rjs.await signal_name="B"/>
  <rjs.emit signal_name="O"/>
</rjs.reactivemachine>;

exports.prg = prg;
