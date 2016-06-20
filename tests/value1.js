"use hopscript"

var hh = require("hiphop");

var prg =
<hh.module>
  <hh.outputsignal name="O" value=5 combine=${(x, y) => x + y}/>
  <hh.loop>
    <hh.emit signal="O" arg=5 />
    <hh.emit signal="O" arg=10 />
    <hh.pause/>
  </hh.loop>
</hh.module>

exports.prg = new hh.ReactiveMachine(prg, "value1");
