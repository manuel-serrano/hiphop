"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigO = new rk.ValuedSignal("O", "number");

var const1 = <rjs.constexpr value=1 />;
var subexpr1 = <rjs.sigexpr get_pre get_value signal_name="S" />;
var expr1 = <rjs.plusexpr expr1=${subexpr1} expr2=${const1} />;
var expr2 = <rjs.sigexpr get_value signal_name="S"/>

var prg = <rjs.ReactiveMachine name="value1">
    <rjs.outputsignal ref=${sigO}/>
    <rjs.loop>
    <rjs.sequence>
    <rjs.localsignal signal_name="S" combine_with="+" type="number" init_value=1 >
    <rjs.sequence>
    <rjs.emit signal_name="S" expr=${expr1}/>
    <rjs.emit signal_name="O" expr=${expr2}/>
    </rjs.sequence>
   </rjs.localsignal>
    <rjs.pause/>
    </rjs.sequence>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
