"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.outputsignal name="O" type="number"/>
  <hh.loop>
    <hh.sequence>
      <hh.emit signal_name="O" exprs=5 />
      <hh.emit signal_name="O" exprs=5 />
      <hh.pause/>
    </hh.sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "emiterror");
