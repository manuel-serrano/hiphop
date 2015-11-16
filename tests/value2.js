"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigI = new rjs.ValuedSignal("I", "number", undefined, undefined);
var sigO = new rjs.ValuedSignal("O", "number", 5, "*");
var sigU = new rjs.ValuedSignal("U", "number", undefined, undefined);

function minus(arg1, arg2) { return arg1 - arg2 };
function plus(arg1, arg2) { return arg1 + arg2 };

var expr1 = <rjs.expr func=${plus} exprs=${[(3 - 2), 5]}/>;

var subexpr2 = <rjs.sigexpr get_value signal_name="I"/>;
var expr2 = <rjs.expr func=${plus} exprs=${[subexpr2, 7]}/>;

var subexpr3 = <rjs.sigexpr get_value get_pre signal_name="O"/>;
var expr3 = <rjs.expr func=${minus} exprs=${[subexpr3, 1]}/>

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
