"use hopscript"

var hh = require("hiphop");

function sum(arg1, arg2) {
   return arg1 + arg2;
}

var prg = <hh.module>
  <hh.outputsignal name="O" valued/>
  <hh.loop>
    <hh.let>
      <hh.signal name="S"  init_value=1 />
      <hh.emit signal="S" func=${sum} arg0=${hh.preValue("S")} arg1=1/>
      <hh.emit signal="O" arg=${hh.value("S")}/>
    </hh.let>
    <hh.pause/>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "emitvaluedlocal2");
