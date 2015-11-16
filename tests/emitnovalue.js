"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigO = new rjs.ValuedSignal("O", "number");

var prg = <rjs.ReactiveMachine debug name="emitnovalue">
  <rjs.outputsignal ref=${sigO}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="O" expr=5 />
      <rjs.pause/>
      <rjs.emit signal_name="O" />
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
