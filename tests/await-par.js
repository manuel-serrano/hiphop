"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.reactivemachine debug name="awaitpar">
  <rjs.inputsignal name="A"/>
  <rjs.inputsignal name="B"/>
  <rjs.outputsignal name="O"/>
  <rjs.sequence>
    <rjs.parallel>
      <rjs.await signal_name="A"/>
      <rjs.await signal_name="B"/>
    </rjs.parallel>
    <rjs.emit signal_name="O"/>
  </rjs.sequence>
</rjs.reactivemachine>;

exports.prg = prg;
