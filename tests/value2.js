"use hopscript"

var rjs = require("reactive-js");

function minus(arg1, arg2) { return arg1 - arg2 };
function plus(arg1, arg2) { return arg1 + arg2 };

var expr1 = <rjs.expr func=${plus} exprs=${[(3 - 2), 5]}/>;

var subexpr2 = <rjs.sigexpr get_value signal_name="I"/>;
var expr2 = <rjs.expr func=${plus} exprs=${[subexpr2, 7]}/>;

var subexpr3 = <rjs.sigexpr get_value get_pre signal_name="O"/>;
var expr3 = <rjs.expr func=${minus} exprs=${[subexpr3, 1]}/>

var prg = <rjs.ReactiveMachine debug name="value2">
  <rjs.outputsignal name="I" type="number"/>
  <rjs.outputsignal name="O" type="number" init_value=5 combine_with="*"/>
  <rjs.outputsignal name="U" type="number"/>
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
