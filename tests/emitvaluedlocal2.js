"use hopscript"

var hh = require("hiphop");

function sum(arg1, arg2) {
   return arg1 + arg2;
}

var prg = <hh.module>
  <hh.outputsignal name="O" type="number"/>
  <hh.loop>
    <hh.localsignal name="S" type="number" init_value=1 >
      <hh.emit signal_name="S" func=${sum} exprs=${[hh.preValue("S"),1]}/>
      <hh.emit signal_name="O" exprs=${hh.value("S")}/>
    </hh.localsignal>
    <hh.pause/>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "emitvaluedlocal2");
