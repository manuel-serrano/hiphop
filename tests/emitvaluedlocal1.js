"use hopscript"

var hh = require("hiphop");

function sum(arg1, arg2) {
   return arg1 + arg2;
}

var prg = <hh.module>
  <hh.outputsignal name="O" valued/>
  <hh.loop>
    <hh.sequence>
      <hh.localsignal name="S" init_value=1 >
	<hh.sequence>
	  <hh.emit signal_name="S" func=${sum}
		    args=${[hh.preValue("S"), 1]}/>
	  <hh.emit signal_name="O" args=${hh.value("S")}/>
	</hh.sequence>
      </hh.localsignal>
      <hh.pause/>
      <hh.emit signal_name="O" args=${hh.preValue("O")}/>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "emitvaluedlocal1");
