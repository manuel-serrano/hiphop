"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigO = new rk.ValuedSignal("O", "number", "+", false, 5);

var prg = <rjs.ReactiveMachine name="value1">
    <rjs.loop>
    <rjs.emit signal_name="O" value="5"/>
    <rjs.emit signal_name="O" value="10"/>
    <rjs.pause/>
    </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
