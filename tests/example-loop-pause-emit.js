"use hopscript"

var hh = require("hiphop");

var prg = <hh.module>
  <hh.inputsignal name="I"/>
  <hh.outputsignal name="S"/>
  <hh.loop>
    <hh.Sequence>
      <hh.await signal="I"/>
      <hh.pause/>
      <hh.emit signal="S"/>
    </hh.Sequence>
  </hh.loop>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "looppauseemit");
