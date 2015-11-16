"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigO = new rjs.ValuedSignal("O", "number");

var prg = <rjs.ReactiveMachine name="emiterror">
    <rjs.outputsignal ref=${sigO}/>
    <rjs.loop>
    <rjs.sequence>
    <rjs.emit signal_name="O" expr=5 />
    <rjs.emit signal_name="O" expr=5 />
    <rjs.pause/>
    </rjs.sequence>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
