"use hopscript"

var rjs = require("reactive-js");

var prg = <rjs.ReactiveMachine debug name="emiterror">
  <rjs.outputsignal name="O" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="O" exprs=5 />
      <rjs.emit signal_name="O" exprs=5 />
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
