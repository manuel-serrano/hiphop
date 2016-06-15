"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="A"/>
  <hh.inputsignal name="B"/>
  <hh.outputsignal name="O"/>
  <hh.sequence>
    <hh.parallel>
      <hh.await signal="A"/>
      <hh.await signal="B"/>
    </hh.parallel>
    <hh.emit signal="O"/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "awaitpar");
