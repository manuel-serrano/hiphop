"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigO = new rk.ValuedSignal("O", "number");

var expr1 = <rjs.constexpr value=5 />;

var prg = <rjs.ReactiveMachine name="emiterror">
    <rjs.outputsignal ref=${sigO}/>
    <rjs.loop>
    <rjs.sequence>
    <rjs.emit signal_name="O" expr=${expr1}/>
    <rjs.emit signal_name="O" expr=${expr1}/>
    <rjs.pause/>
    </rjs.sequence>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
