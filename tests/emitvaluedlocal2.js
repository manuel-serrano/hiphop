"use hopscript"

var rjs = require("../lib/reactive-js.js");

var sigO = new rjs.ValuedSignal("O", "number");

var subexpr1 = <rjs.sigexpr get_pre get_value signal_name="S" />;
var expr1 = <rjs.expr func=${function(arg1, arg2) { return arg1 + arg2 }}
		      exprs=${[subexpr1, 1]} />;
var expr2 = <rjs.sigexpr get_value signal_name="S"/>;

var prg = <rjs.ReactiveMachine name="emitvaluedlocal2">
  <rjs.outputsignal ref=${sigO}/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.localsignal signal_name="S" combine_with="+" type="number"
		       init_value=1 >
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
