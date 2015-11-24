"use hopscript"

var rjs = require("reactive-js");

function sum(arg1, arg2) {
   return arg1 + arg2;
}

var prg = <rjs.ReactiveMachine debug name="emitvaluedlocal1">
  <rjs.outputsignal name="O" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.localsignal signal_name="S" combine_with="+" type="number"
		       init_value=1 >
	<rjs.sequence>
	  <rjs.emit signal_name="S" func=${sum}
		    exprs=${[rjs.PreValue("S"), 1]}/>
	  <rjs.emit signal_name="O" exprs=${rjs.Value("S")}/>
	</rjs.sequence>
      </rjs.localsignal>
      <rjs.pause/>
      <rjs.emit signal_name="O" exprs=${rjs.PreValue("O")}/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
