"use hopscript"

var rjs = require("hiphop");

function sum(arg1, arg2) {
   return arg1 + arg2;
}

var prg = <rjs.ReactiveMachine debug name="emitvaluedlocal1">
  <rjs.outputsignal name="O" type="number"/>
  <rjs.loop>
    <rjs.sequence>
      <rjs.localsignal name="S" type="number" init_value=1 >
	<rjs.sequence>
	  <rjs.emit signal_name="S" func=${sum}
		    exprs=${[rjs.preValue("S"), 1]}/>
	  <rjs.emit signal_name="O" exprs=${rjs.value("S")}/>
	</rjs.sequence>
      </rjs.localsignal>
      <rjs.pause/>
      <rjs.emit signal_name="O" exprs=${rjs.preValue("O")}/>
      <rjs.pause/>
    </rjs.sequence>
  </rjs.loop>
</rjs.ReactiveMachine>;

exports.prg = prg;
