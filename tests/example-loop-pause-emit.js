"use hopscript"

var rjs = require("hiphop");

var machine = <rjs.ReactiveMachine debug name="looppauseemit">
  <rjs.inputsignal name="I"/>
  <rjs.outputsignal name="S"/>
  <rjs.loop>
    <rjs.Sequence>
      <rjs.await signal_name="I"/>
      <rjs.pause/>
      <rjs.emit signal_name="S"/>
    </rjs.Sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = machine;
