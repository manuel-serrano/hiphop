"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigI = new rjs.Signal("I");
var sigS = new rjs.Signal("S");

var machine = <rjs.ReactiveMachine debug name="looppauseemit">
  <rjs.inputsignal ref=${sigI}/>
  <rjs.outputsignal ref=${sigS}/>
  <rjs.loop>
    <rjs.Sequence>
      <rjs.await signal_name="I"/>
      <rjs.pause/>
      <rjs.emit signal_name="S"/>
    </rjs.Sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = machine;
