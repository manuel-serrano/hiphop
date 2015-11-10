"use hopscript"

var rjs = require("../xml-compiler.js");
var rk = require("../reactive-kernel.js");

var sigO = new rk.ValuedSignal("O", "number");

var sigSvalpre = <rjs.sigexpr get_pre get_value signal_name="S" />;
var expr1 = <rjs.expr func=${function(arg1, arg2) { return arg1 + arg2 }}
		      exprs=${[sigSvalpre, 1]} />;
var sigSval = <rjs.sigexpr get_value signal_name="S"/>;

var preo = <rjs.sigexpr get_value get_pre signal_name="O"/>;

var prg = <rjs.ReactiveMachine name="emitvaluedlocal1">
    <rjs.outputsignal ref=${sigO}/>
    <rjs.loop>
    <rjs.sequence>
    <rjs.localsignal signal_name="S" combine_with="+" type="number" init_value=1 >
    <rjs.sequence>
    <rjs.emit signal_name="S" expr=${expr1}/>
    <rjs.emit signal_name="O" expr=${sigSval}/>
    </rjs.sequence>
   </rjs.localsignal>
   <rjs.pause/>
   <rjs.emit signal_name="O" expr=${preo}/>
   <rjs.pause/>
    </rjs.sequence>
   </rjs.loop>
   </rjs.ReactiveMachine>;

exports.prg = prg;
