"use hopscript"

var hh = require("hiphop");

function minus(arg1, arg2) { return arg1 - arg2 };
function plus(arg1, arg2) { return arg1 + arg2 };

var prg = <hh.module>
  <hh.outputsignal name="I" valued/>
  <hh.outputsignal name="O"  value=5 />
  <hh.outputsignal name="U" valued/>
  <hh.loop>
    <hh.sequence>
      <hh.emit signal="I" func=${plus} arg0=${3 - 2} arg1=5/>
      <hh.emit signal="O" func=${plus} arg0=${hh.value("I")} arg1=7/>
      <hh.emit signal="U" func=${minus} arg0=${hh.preValue("O")} arg1=1/>
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "value2");
