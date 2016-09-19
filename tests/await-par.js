"use hopscript"

var hh = require("hiphop");

var inSig = {accessibility: hh.IN};
var outSig = {accessibility: hh.OUT};

var prg = <hh.module A=${inSig} B=${inSig} O=${outSig}>
  <hh.sequence>
    <hh.parallel>
      <hh.await A/>
      <hh.await B/>
    </hh.parallel>
    <hh.emit O/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "awaitpar");
