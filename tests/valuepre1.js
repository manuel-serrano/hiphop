"use hopscript"

var rjs = require("hiphop");

var prg = <rjs.ReactiveMachine debug name="valuepre1">
  <rjs.outputsignal name="I" type="number"/>
  <rjs.outputsignal name="O" type="number" init_value=5 />
  <rjs.outputsignal name="U" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="I" exprs=3 />
      <rjs.emit signal_name="O" exprs=${rjs.value("I")}/>
      <rjs.emit signal_name="U" exprs=${rjs.preValue("O")}/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
