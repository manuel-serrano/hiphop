"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigO = new rjs.ValuedSignal("O", "number", 5, "+");

var prg = <rjs.ReactiveMachine name="value1">
  <rjs.outputsignal ref=${sigO}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="O" expr=5 />
      <rjs.emit signal_name="O" expr=10 />
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
