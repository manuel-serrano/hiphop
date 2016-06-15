"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="O" valued/>
  <hh.loop>
    <hh.sequence>
      <hh.emit signal="O" arg=5 />
      <hh.pause/>
      <hh.emit signal="O" />
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "emitnovalue");
