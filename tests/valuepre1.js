"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigI = new rjs.ValuedSignal("I", "number", undefined, undefined);
var sigO = new rjs.ValuedSignal("O", "number", 5, "+");
var sigU = new rjs.ValuedSignal("U", "number", undefined, undefined);

var prg = <rjs.ReactiveMachine debug name="valuepre1">
  <rjs.outputsignal ref=${sigI}/>
  <rjs.outputsignal ref=${sigO}/>
  <rjs.outputsignal ref=${sigU}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.emit signal_name="I" expr=3 />
      <rjs.emit signal_name="O"
		expr=${<rjs.sigexpr get_value signal_name="I"/>}/>
      <rjs.emit signal_name="U"
		expr=${<rjs.sigexpr get_value get_pre signal_name="O"/>}/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
