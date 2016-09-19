"use hopscript"

var hh = require("hiphop");

var sigIn={accessibility: hh.IN};
var sigOut={accessibility: hh.OUT};

var prg = <hh.module A=${sigIn} B=${sigIn} O=${sigOut}>
  <hh.sequence>
    <hh.await A/>
    <hh.await B/>
    <hh.emit O/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "awaitseq");
