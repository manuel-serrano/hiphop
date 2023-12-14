"use hopscript"

import * as hh from "@hop/hiphop";

const sigIn={accessibility: hh.IN};
const sigOut={accessibility: hh.OUT};

const prg = <hh.module A=${sigIn} B=${sigIn} O=${sigOut}>
  <hh.sequence>
    <hh.await A/>
    <hh.await B/>
    <hh.emit O/>
  </hh.sequence>
</hh.module>;

exports.prg = new hh.ReactiveMachine(prg, "awaitseq");
