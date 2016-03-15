"use hopscript"

var hh = require("hiphop");

var prg =
<hh.module>
  <hh.outputsignal name="O" init_value=5 combine_with=${(x, y) => x + y}/>
  <hh.loop>
    <hh.emit signal_name="O" args=5 />
    <hh.emit signal_name="O" args=10 />
    <hh.pause/>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "value1");
