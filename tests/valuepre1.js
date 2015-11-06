"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigI = new rk.ValuedSignal("I", "number");
var sigO = new rk.ValuedSignal("O", "number", "+", 5);
var sigU = new rk.ValuedSignal("U", "number");

var expr1 = <rjs.constexpr value=3 />;
var expr2 = <rjs.sigexpr get_value signal_name="I"/>;
var expr3 = <rjs.sigexpr get_value get_pre signal_name="O"/>;

var prg = <rjs.ReactiveMachine name="valuepre1">
    <rjs.outputsignal ref=${sigI}/>
    <rjs.outputsignal ref=${sigO}/>
    <rjs.outputsignal ref=${sigU}/>
    <rjs.loop>
    <rjs.sequence>

<!--    ${var expr1 = <rjs.constexr value=3 />;} -->
    <rjs.emit signal_name="I" expr=${expr1}/>

<!--    ${var expr2 = <rjs.sigexpr get_value signal_name="I"/>;} -->
    <rjs.emit signal_name="O" expr=${expr2}/>

<!--   ${var expr3 = <rjs.sigexpr get_value get_pre signal_name="O"/>;} -->
    <rjs.emit signal_name="U" expr=${expr3}/>

    <rjs.pause/>
    </rjs.sequence>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
