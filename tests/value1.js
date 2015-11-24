"use hopscript"

var rjs = require("reactive-js");

var prg = <rjs.ReactiveMachine debug name="value1">
  <rjs.outputsignal name="O" type="number" init_value=5 combine_with="+"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="O" exprs=5 />
      <rjs.emit signal_name="O" exprs=10 />
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
