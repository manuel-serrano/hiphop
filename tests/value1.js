"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigO = new rk.ValuedSignal("O", "number", "+", false, 5);

var expr1 = <rjs.constexpr value=5 />;
var expr2 = <rjs.constexpr value=10 />;

var prg = <rjs.ReactiveMachine name="value1">
    <rjs.outputsignal ref=${sigO}/>
    <rjs.loop>
    <rjs.sequence>
    <rjs.emit signal_name="O" expr=${expr1}/>
    <rjs.emit signal_name="O" expr=${expr2}/>
    <rjs.pause/>
    </rjs.sequence>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
