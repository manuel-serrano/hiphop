"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigI = new rk.ValuedSignal("I", "number", undefined, undefined);
var sigO = new rk.ValuedSignal("O", "number", 5, "*");
var sigU = new rk.ValuedSignal("U", "number", undefined, undefined);

var const1 = <rjs.constexpr value=1 />;
var const2 = <rjs.constexpr value=2 />;
var const3 = <rjs.constexpr value=3 />;
var const5 = <rjs.constexpr value=5 />;
var const7 = <rjs.constexpr value=7 />;

var subexpr1 = <rjs.minusexpr expr1=${const3} expr2=${const2}/>;
var expr1 = <rjs.plusexpr expr1=${subexpr1} expr2=${const5}/>;

var subexpr2 = <rjs.sigexpr get_value signal_name="I"/>;
var expr2 = <rjs.plusexpr expr1=${subexpr2} expr2=${const7}/>;

var subexpr3 = <rjs.sigexpr get_value get_pre signal_name="O"/>;
var expr3 = <rjs.minusexpr expr1=${subexpr3} expr2=${const1}/>

var prg = <rjs.ReactiveMachine name="value2">
    <rjs.outputsignal ref=${sigI}/>
    <rjs.outputsignal ref=${sigO}/>
    <rjs.outputsignal ref=${sigU}/>
    <rjs.loop>
    <rjs.sequence>
    <rjs.emit signal_name="I" expr=${expr1}/>
    <rjs.emit signal_name="O" expr=${expr2}/>
    <rjs.emit signal_name="U" expr=${expr3}/>
    <rjs.pause/>
    </rjs.sequence>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
